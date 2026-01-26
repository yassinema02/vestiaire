import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { supabase, isSupabaseConfigured } from './services/supabase';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('checking');

  useEffect(() => {
    const testConnection = async () => {
      if (!isSupabaseConfigured()) {
        setConnectionStatus('not-configured');
        console.log('⚠️ Supabase not configured. Please add credentials to .env.local');
        return;
      }

      try {
        // Simple connection test - check if we can reach Supabase
        const { error } = await supabase.from('profiles').select('count').limit(1);

        if (error) {
          // Table might not exist yet, but connection works
          console.log('ℹ️ Supabase connection test:', error.message);
          // If error is about table not existing, connection still works
          if (error.message.includes('does not exist')) {
            setConnectionStatus('connected');
            console.log('✅ Supabase connected! (profiles table not yet created)');
          } else {
            setConnectionStatus('error');
            console.error('❌ Supabase connection error:', error.message);
          }
        } else {
          setConnectionStatus('connected');
          console.log('✅ Supabase connected successfully!');
        }
      } catch (err) {
        setConnectionStatus('error');
        console.error('❌ Supabase connection failed:', err);
      }
    };

    testConnection();
  }, []);

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Checking Supabase connection...';
      case 'connected':
        return '✅ Supabase Connected!';
      case 'not-configured':
        return '⚠️ Supabase not configured\n\nPlease create .env.local with:\nEXPO_PUBLIC_SUPABASE_URL\nEXPO_PUBLIC_SUPABASE_ANON_KEY';
      case 'error':
        return '❌ Connection Error\n\nCheck console for details';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vestiaire</Text>
      {connectionStatus === 'checking' && <ActivityIndicator size="large" color="#6366f1" />}
      <Text style={styles.status}>{getStatusMessage()}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  status: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 24,
  },
});
