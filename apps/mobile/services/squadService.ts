/**
 * Squad Service
 * CRUD operations for Style Squads and memberships.
 * Story 9.1: Style Squads Creation
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { StyleSquad, SquadMember, CreateSquadInput } from '../types/social';

/**
 * Generate a 6-character uppercase alphanumeric invite code.
 */
export function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export const squadService = {
    /**
     * Create a new squad. The current user becomes the admin.
     */
    async createSquad(input: CreateSquadInput): Promise<{ squad: StyleSquad | null; error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Generate a unique invite code (retry on collision)
            let inviteCode = generateInviteCode();
            let attempts = 0;
            while (attempts < 5) {
                const { data: existing } = await supabase
                    .from('style_squads')
                    .select('id')
                    .eq('invite_code', inviteCode)
                    .maybeSingle();
                if (!existing) break;
                inviteCode = generateInviteCode();
                attempts++;
            }

            // Insert squad
            const { data: squad, error: squadError } = await supabase
                .from('style_squads')
                .insert({
                    creator_id: userId,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    invite_code: inviteCode,
                })
                .select()
                .single();

            if (squadError || !squad) {
                return { squad: null, error: squadError || new Error('Failed to create squad') };
            }

            // Add creator as admin member
            const { error: memberError } = await supabase
                .from('squad_memberships')
                .insert({
                    squad_id: squad.id,
                    user_id: userId,
                    role: 'admin',
                });

            if (memberError) {
                // Rollback squad creation
                await supabase.from('style_squads').delete().eq('id', squad.id);
                return { squad: null, error: memberError };
            }

            return { squad: { ...squad, member_count: 1 }, error: null };
        } catch (error) {
            return { squad: null, error: error as Error };
        }
    },

    /**
     * Get all squads the current user belongs to, with member counts.
     */
    async getMySquads(): Promise<{ squads: StyleSquad[]; error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Get squad IDs user belongs to
            const { data: memberships, error: memError } = await supabase
                .from('squad_memberships')
                .select('squad_id')
                .eq('user_id', userId);

            if (memError) return { squads: [], error: memError };
            if (!memberships || memberships.length === 0) return { squads: [], error: null };

            const squadIds = memberships.map((m) => m.squad_id);

            // Fetch squads
            const { data: squads, error: squadError } = await supabase
                .from('style_squads')
                .select('*')
                .in('id', squadIds)
                .order('updated_at', { ascending: false });

            if (squadError) return { squads: [], error: squadError };

            // Get member counts per squad
            const { data: counts, error: countError } = await supabase
                .from('squad_memberships')
                .select('squad_id')
                .in('squad_id', squadIds);

            if (countError) return { squads: squads || [], error: null };

            const countMap: Record<string, number> = {};
            (counts || []).forEach((c) => {
                countMap[c.squad_id] = (countMap[c.squad_id] || 0) + 1;
            });

            const squadsWithCounts = (squads || []).map((s) => ({
                ...s,
                member_count: countMap[s.id] || 0,
            }));

            return { squads: squadsWithCounts, error: null };
        } catch (error) {
            return { squads: [], error: error as Error };
        }
    },

    /**
     * Get members of a squad with profile data.
     */
    async getSquadMembers(squadId: string): Promise<{ members: SquadMember[]; error: Error | null }> {
        try {
            const { data, error } = await supabase
                .from('squad_memberships')
                .select(`
                    id,
                    squad_id,
                    user_id,
                    role,
                    joined_at,
                    profiles:user_id (display_name, avatar_url)
                `)
                .eq('squad_id', squadId)
                .order('joined_at', { ascending: true });

            if (error) return { members: [], error };

            const members: SquadMember[] = (data || []).map((row: any) => ({
                id: row.id,
                squad_id: row.squad_id,
                user_id: row.user_id,
                role: row.role,
                joined_at: row.joined_at,
                display_name: row.profiles?.display_name || null,
                avatar_url: row.profiles?.avatar_url || null,
            }));

            return { members, error: null };
        } catch (error) {
            return { members: [], error: error as Error };
        }
    },

    /**
     * Join a squad by invite code.
     */
    async joinSquadByCode(inviteCode: string): Promise<{ squad: StyleSquad | null; error: string | null }> {
        try {
            const userId = await requireUserId();
            const code = inviteCode.trim().toUpperCase();

            // Find squad by code
            const { data: squad, error: findError } = await supabase
                .from('style_squads')
                .select('*')
                .eq('invite_code', code)
                .maybeSingle();

            if (findError || !squad) {
                return { squad: null, error: 'Invalid invite code. Please check and try again.' };
            }

            // Check if already a member
            const { data: existing } = await supabase
                .from('squad_memberships')
                .select('id')
                .eq('squad_id', squad.id)
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) {
                return { squad: null, error: 'You are already a member of this squad.' };
            }

            // Check member count
            const { count } = await supabase
                .from('squad_memberships')
                .select('id', { count: 'exact', head: true })
                .eq('squad_id', squad.id);

            if ((count ?? 0) >= squad.max_members) {
                return { squad: null, error: 'This squad is full. Maximum 20 members allowed.' };
            }

            // Join
            const { error: joinError } = await supabase
                .from('squad_memberships')
                .insert({
                    squad_id: squad.id,
                    user_id: userId,
                    role: 'member',
                });

            if (joinError) {
                return { squad: null, error: 'Failed to join squad. Please try again.' };
            }

            return { squad, error: null };
        } catch (error) {
            return { squad: null, error: 'Something went wrong. Please try again.' };
        }
    },

    /**
     * Remove a member from a squad (admin-only, enforced in app logic).
     */
    async removeMember(squadId: string, targetUserId: string): Promise<{ error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Verify caller is admin
            const { data: callerMembership } = await supabase
                .from('squad_memberships')
                .select('role')
                .eq('squad_id', squadId)
                .eq('user_id', userId)
                .single();

            if (callerMembership?.role !== 'admin') {
                return { error: new Error('Only admins can remove members.') };
            }

            const { error } = await supabase
                .from('squad_memberships')
                .delete()
                .eq('squad_id', squadId)
                .eq('user_id', targetUserId);

            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Leave a squad. Sole admin cannot leave.
     */
    async leaveSquad(squadId: string): Promise<{ error: string | null }> {
        try {
            const userId = await requireUserId();

            // Check if user is the sole admin
            const { data: membership } = await supabase
                .from('squad_memberships')
                .select('role')
                .eq('squad_id', squadId)
                .eq('user_id', userId)
                .single();

            if (membership?.role === 'admin') {
                const { count } = await supabase
                    .from('squad_memberships')
                    .select('id', { count: 'exact', head: true })
                    .eq('squad_id', squadId)
                    .eq('role', 'admin');

                if ((count ?? 0) <= 1) {
                    return { error: 'You are the only admin. Delete the squad or promote another member first.' };
                }
            }

            const { error } = await supabase
                .from('squad_memberships')
                .delete()
                .eq('squad_id', squadId)
                .eq('user_id', userId);

            return { error: error?.message || null };
        } catch (error) {
            return { error: 'Something went wrong. Please try again.' };
        }
    },

    /**
     * Delete a squad entirely (creator-only). Memberships cascade.
     */
    async deleteSquad(squadId: string): Promise<{ error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Verify caller is creator
            const { data: squad } = await supabase
                .from('style_squads')
                .select('creator_id')
                .eq('id', squadId)
                .single();

            if (squad?.creator_id !== userId) {
                return { error: new Error('Only the creator can delete this squad.') };
            }

            const { error } = await supabase
                .from('style_squads')
                .delete()
                .eq('id', squadId);

            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
