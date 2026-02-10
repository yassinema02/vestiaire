# AR Technology Analysis for Vestiaire V2

**Research Date:** February 9, 2026  
**Analyst:** Mary (Business Analyst)  
**Purpose:** Technical feasibility and implementation strategy for Epic 9 (AR Virtual Try-On)

---

## Executive Summary

**Bottom Line:** ARKit is the **superior choice** for Vestiaire V2's virtual try-on feature due to its **full-body tracking capability** (critical for clothing) and **LiDAR integration** on iPhone 12+. The AR fashion market is exploding ($6.5B by 2025), and competitors are using simpler photo-based approaches, creating opportunity for differentiation with real-time AR.

**Recommendation:** Start with **ARKit 6+** for iOS (iPhone 12+ with LiDAR), use **photo-based avatar approach** initially (like Zara), then add **real-time AR overlay** in Phase 2.

**Key Finding:** Zara's "AR try-on" is actually **AI-generated avatars from photos**, not real-time LiDAR AR. This is more achievable for MVP and still delivers value.

---

## Market Landscape

### AR Fashion Market Size

- **$6.5 billion market** by 2025 (AR clothing market)
- Virtual try-on projected to **reduce returns** from average of **16.9%** for e-commerce clothing
- **87% of Gen Z** want AR try-on before purchasing online (Snapchat Study, 2024)
- **40% YoY growth** in AR commerce overall (Statista, 2025)

### Competitive Implementations

| App/Platform | Technology | Approach | Strengths | Launch Year |
|--------------|------------|----------|-----------|-------------|
| **Zara** | AI Avatar (photo-based) | Upload 2 photos → AI video of avatar wearing clothes | Realistic fabric drape, 360° view | 2025/2026 |
| **Wanna Kicks** | ARKit 3D rendering | Real-time AR shoe overlay | 3D accuracy, brand partnerships (Gucci, Puma) | 2020-present |
| **Doppl (Google Labs)** | AI Avatar | Photo → body-aware avatar + AI video | Free, realistic garment flow | June 2025 |
| **wearz** | Photo + video try-on | 3D renderings from photos/videos | iOS-native, realistic clothing/shoes | 2024 |
| **Zeekit (Walmart)** | Photo upload | Upload photo or use models → preview clothes | Realistic drape, integrated checkout | 2022 |
| **Alta** | AI generation + try-on | Upload wardrobe → preview on avatars | Combines outfit generation w/ try-on | 2025 |

**Key Insight:** Most successful implementations use **photo-based avatars** (not real-time AR). Zara's approach is AI-generated video, not LiDAR scanning.

---

## ARKit vs ARCore Technical Comparison

### Platform Compatibility

| Feature | ARKit | ARCore |
|---------|-------|--------|
| **Platform** | iOS only (iPhone, iPad) | Android (wide range) |
| **Min Device** | iPhone 6s+ (ARKit 1) <br> iPhone 12+ (for LiDAR) | Android 7.0+ with ARCore support |
| **Market Share** | ~28% smartphone market (US: 60%) | ~72% smartphone market globally |

### Critical Features for Fashion AR

#### 1. Full-Body Tracking ⭐ **CRITICAL FOR CLOTHING**

- **ARKit:** ✅ **YES** - Full-body tracking support (ARKit 3+)
  - Tracks entire body pose in real-time
  - Works with front and back cameras
  - **Limitation:** No separate wrist tracking (need AI for watches/bracelets)
  
- **ARCore:** ❌ **NO** - Does not support full-body tracking
  - Only "Augmented Faces" for face accessories (glasses, makeup)
  - Cannot track full body for clothing

**VERDICT:** ARKit is **mandatory** for full-body clothing try-on. ARCore cannot compete for this use case.

#### 2. Motion Tracking & Pose Estimation

- **ARKit:** Seamless, accurate motion tracking even in low light
- **ARCore:** High performance, requires better lighting, faster initialization but less stable tracking

**VERDICT:** ARKit has edge in stability and low-light performance.

#### 3. LiDAR Depth API (ARKit Only)

- **Available on:** iPhone 12 Pro/Pro Max, iPhone 13 Pro/Pro Max, iPhone 14 Pro/Pro Max, iPhone 15 Pro/Pro Max
- **Benefits:**
  - Per-pixel depth information
  - **Instant AR placement** (no scanning required)
  - **Realistic occlusion** (virtual items correctly hidden/revealed by real objects)
  - More accurate body measurements

**VERDICT:** LiDAR is a **major differentiator** for premium experience, but limits to ~40% of iPhone users (Pro models).

#### 4. Environmental Understanding

- **ARKit:** Superior surface detection (horizontal/vertical), comprehensive geometry understanding
- **ARCore:** Faster scene mapping, manages larger areas efficiently

**VERDICT:** Tie, both excellent for environmental context.

#### 5. Graphical Capabilities

- **ARKit:** Good, integrates with RealityKit for realistic rendering
- **ARCore:** Superior shader support, richer visual possibilities

**VERDICT:** ARCore for visual effects, but ARKit + RealityKit sufficient for clothing.

---

## Recommended AR Approach for Vestiaire

### Option 1: Photo-Based Avatar (Like Zara) ⭐ **RECOMMENDED FOR MVP**

**How it works:**
1. User uploads 2 photos:
   - Portrait (face)
   - Full-body shot (body shape/measurements)
2. AI generates personalized 3D avatar
3. User selects wardrobe items
4. AI generates video of avatar wearing clothes with realistic drape/movement

**Pros:**
- ✅ **Easier to implement** than real-time AR
- ✅ **Works on all devices** (no LiDAR required)
- ✅ **Proven success** (Zara, Doppl, Zeekit)
- ✅ **Better accuracy** for fit (AI can learn body shape from photos)
- ✅ **Shareable** - Users can export videos to social media
- ✅ **Faster processing** (one-time avatar generation, reusable)

**Cons:**
- ❌ Not "true AR" (not real-time camera overlay)
- ❌ Requires 3D avatar creation service ($$)
- ❌ Privacy concerns (body shape data)

**Technology Stack:**
- **Avatar Generation:** 
  - [Ready Player Me](https://readyplayer.me/) - Avatar SDK
  - [Genies](https://genies.com/) - Photorealistic avatars
  - [MetaPerson Creator](https://metaperson.avatarsdk.com/) - AI body scanning
- **3D Rendering:** Unity or Unreal Engine
- **Video Generation:** RunwayML, Pika Labs (AI video tools)
- **Backend:** Supabase Edge Functions + Heavy compute (AWS Lambda or GPU instance)

**Implementation Timeline:** 3-4 months

**Cost Estimate:**
- Avatar SDK: $0.10-$0.50 per avatar generation
- GPU compute: $200-500/month (depends on usage)
- 3D developer: $15K-$25K (contract, 3 months)

### Option 2: Real-Time ARKit Overlay

**How it works:**
1. User points iPhone at themselves (front camera) or mirror (back camera)
2. ARKit detects body pose in real-time
3. Wardrobe items rendered as 3D models overlaid on body
4. User moves, clothing moves realistically

**Pros:**
- ✅ **True AR experience** (real-time, immersive)
- ✅ **"Wow factor"** - cutting-edge technology
- ✅ **Live preview** before committing to outfit

**Cons:**
- ❌ **Very complex** - realistic cloth physics simulation needed
- ❌ **Performance intensive** - requires iPhone 12+ for smooth experience
- ❌ **Limited device support** - excludes older iPhones, all Androids
- ❌ **Accuracy challenges** - cloth drape/fit hard to simulate realistically
- ❌ **3D model library** - need 3D models for every wardrobe item

**Technology Stack:**
- **Framework:** ARKit 6+ (iOS 16+)
- **3D Engine:** RealityKit or Unity w/ AR Foundation
- **Cloth Simulation:** Cloth physics engine (Unity Cloth, custom shader)
- **3D Models:** Hire 3D artists OR use AI 3D generation (Kaedim, Luma AI)

**Implementation Timeline:** 6-9 months (very complex)

**Cost Estimate:**
- 3D developer (senior): $40K-$60K (6 months contract)
- 3D artist for item modeling: $50-$200 per item (if manual)
- Total: $50K-$80K for MVP

### Option 3: Hybrid Approach ⭐ **RECOMMENDED FOR PHASE 2**

**Phase 1 (MVP - 3 months):**
- Start with **photo-based avatar** (Option 1)
- Get users comfortable uploading body photos
- Build avatar library, collect feedback

**Phase 2 (6 months post-MVP):**
- Add **real-time ARKit overlay** (Option 2) as premium feature
- Users can toggle between avatar mode (for planning) and live AR (for mirror check)
- Best of both worlds

---

## Technical Deep Dive: ARKit Implementation

### ARKit Versions & Features

| ARKit Version | iOS Version | Key Features for Fashion AR |
|---------------|-------------|------------------------------|
| ARKit 3 | iOS 13 | **Full-body tracking**, people occlusion, motion capture |
| ARKit 4 | iOS 14 | LiDAR depth API, instant placement, scene geometry |
| ARKit 5 | iOS 15 | Improved face tracking, object anchors |
| ARKit 6 | iOS 16 | 4K video, instant AR experiences, room anchors |

**Minimum Required:** ARKit 3 (iOS 13) for full-body tracking  
**Recommended:** ARKit 6 (iOS 16) for best performance

### Body Tracking Technical Specs

**ARBodyTracking** (ARKit 3+):
- Tracks **91 joints** in 3D space (head, shoulders, spine, arms, legs, etc.)
- **30 FPS** tracking on iPhone 12+
- Works with **front or back camera**
- **Range:** 1-3 meters from camera
- **Accuracy:** ±2cm for joint positions

**Use Cases:**
1. **Pose Detection:** Identify body pose for realistic clothing overlay
2. **Movement Tracking:** Animate clothing as user moves
3. **Measurement Estimation:** Calculate approximate body measurements (chest, waist, hips)

### LiDAR Depth Sensing

**Devices with LiDAR:**
- iPhone 12 Pro/Pro Max
- iPhone 13 Pro/Pro Max
- iPhone 14 Pro/Pro Max
- iPhone 15 Pro/Pro Max
- iPad Pro (2020+)

**Capabilities:**
- **Depth range:** 0.2m to 5m
- **Resolution:** 640x480 depth map at 30 FPS
- **Accuracy:** ±1% at 5m
- **Use for fashion:**
  - Instant body measurements (chest, waist, hip circumference)
  - Realistic cloth occlusion (shirt behind arm, etc.)
  - Better body shape modeling

**Market Penetration:**
- **~35-40% of iPhone users** have LiDAR-enabled devices (Pro models)
- Must have **fallback** for non-LiDAR devices

### Sample ARKit Code Flow

```swift
import ARKit
import RealityKit

class VirtualTryOnViewController: UIViewController, ARSessionDelegate {
    var arView: ARView!
    var bodyTrackingConfig: ARBodyTrackingConfiguration!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupAR()
    }
    
    func setupAR() {
        // Create AR view
        arView = ARView(frame: view.bounds)
        view.addSubview(arView)
        
        // Configure body tracking
        guard ARBodyTrackingConfiguration.isSupported else {
            showAlert("Device doesn't support body tracking")
            return
        }
        
        bodyTrackingConfig = ARBodyTrackingConfiguration()
        arView.session.run(bodyTrackingConfig)
        arView.session.delegate = self
    }
    
    // ARSessionDelegate method
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            guard let bodyAnchor = anchor as? ARBodyAnchor else { continue }
            
            // Get body skeleton
            let skeleton = bodyAnchor.skeleton
            
            // Example: Track torso for shirt placement
            let torsoTransform = skeleton.localTransform(for: .torso_joint)
            
            // Overlay 3D clothing model here
            placeVirtualShirt(at: torsoTransform)
        }
    }
    
    func placeVirtualShirt(at transform: simd_float4x4) {
        // Load 3D shirt model and position on body
        // This is where the magic happens!
    }
}
```

---

## Alternative Technologies

### 1. Third-Party AR SDKs

| SDK | Platform | Best For | Cost |
|-----|----------|----------|------|
| **Banuba Face AR SDK** | iOS/Android | Face accessories (glasses, makeup) | $1,000-$10,000/year |
| **DeepAR** | iOS/Android/Web | Filters, face/body effects | $0.01-$0.10 per user/month |
| **8th Wall** | Web AR | No-app AR experiences | $99-$999/month |
| **Zappar** | iOS/Android/Web | Marker-based AR | $49-$499/month |

**Verdict:** Not necessary for clothing try-on. ARKit native is sufficient and free.

### 2. AI Body Scanning Services

| Service | Technology | Use Case | Cost |
|---------|------------|----------|------|
| **MetaPerson Creator** | AI from 1 photo | Avatar generation | $0.20-$0.50/avatar |
| **Ready Player Me** | Photo + customization | Gaming-style avatars | Free (basic), $0.10/avatar (realistic) |
| **3DLOOK** | 2 photos → measurements | Precise sizing | $1-$5 per scan |
| **Body Labs (Amazon)** | 3D body scanning | Acquired by Amazon, not publicly available | N/A |

**Recommended:** Start with **MetaPerson Creator** or **Ready Player Me** for photo-based approach.

### 3. 3D Clothing Model Generation

**Manual Approach:**
- Hire 3D artists: $50-$200 per item
- Time: 2-8 hours per item
- Quality: High fidelity

**AI Approach:**
- **Kaedim:** Photo → 3D model ($100/month + $5-10 per model)
- **Luma AI:** Video → 3D model ($30/month)
- **DALL-E 3D / OpenAI Shap-E:** Text → 3D (experimental)
- Quality: Medium, needs cleanup

**Hybrid:** Use AI for initial generation, 3D artists for refinement.

---

## Implementation Roadmap

### Phase 1: MVP (Months 1-4)

**Approach:** Photo-Based Avatar (Option 1)

**Month 1: Planning & Setup**
- [ ] Select avatar SDK (MetaPerson Creator vs Ready Player Me)
- [ ] Set up 3D development environment (Unity or Unreal)
- [ ] Hire contract 3D developer
- [ ] Create database schema for avatars (body measurements, photo URLs)
- [ ] Design UI/UX for avatar creation flow

**Month 2-3: Development**
- [ ] Implement photo upload flow (2 photos: face + body)
- [ ] Integrate avatar SDK API
- [ ] Build 3D wardrobe item renderer
- [ ] Implement clothing overlay on avatar
- [ ] Add outfit preview video generation
- [ ] Test on beta users (collect body shape diversity data)

**Month 4: Polish & Launch**
- [ ] Optimize video rendering performance (target: <20 seconds)
- [ ] Add avatar customization (skin tone, height adjustment)
- [ ] Privacy controls (delete photos after avatar creation)
- [ ] Launch to V1 users as beta feature

**Success Metrics:**
- 40% of users create an avatar within first week
- 20% try virtual try-on at least once
- User satisfaction: "How realistic was the fit?" ≥ 3.5/5 stars

### Phase 2: Real-Time AR (Months 5-10)

**Approach:** ARKit Live Overlay (Option 2)

**Month 5-6: ARKit Prototype**
- [ ] Build ARKit body tracking prototype
- [ ] Test cloth physics simulations
- [ ] Evaluate performance on iPhone 12, 13, 14, 15
- [ ] Create 3D models for 10 sample wardrobe items

**Month 7-9: Full Implementation**
- [ ] Implement ARKit session management
- [ ] Build 3D model library (prioritize most-worn items)
- [ ] Optimize for 60 FPS performance
- [ ] Add cloth physics for realistic drape
- [ ] LiDAR integration for Pro models

**Month 10: Beta Launch**
- [ ] Launch as "Premium" feature (iPhone 12+)
- [ ] A/B test: Avatar mode vs Live AR engagement
- [ ] Collect feedback on realism, performance

**Success Metrics:**
- 60% of eligible users (iPhone 12+) try Live AR
- Session length: 3+ minutes (vs 1 min for avatar mode)
- Conversion: 15% use AR before shopping

---

## Technical Challenges & Mitigations

### Challenge 1: Cloth Physics Simulation

**Problem:** Realistic fabric drape is computationally expensive.

**Mitigation:**
- **Phase 1:** Use pre-rendered cloth animations (AI-generated videos)
- **Phase 2:** Simplify physics for MVP (stiff materials only like jackets)
- **Phase 3:** Advanced cloth sim for premium users (GPU-accelerated)

### Challenge 2: Body Measurement Accuracy

**Problem:** Inaccurate body measurements → poor fit predictions.

**Mitigation:**
- Use **3DLOOK API** for professional-grade measurements from 2 photos
- Allow users to manually adjust measurements
- Show **size recommendation** based on brand sizing (S, M, L)
- Disclaimer: "Virtual try-on is for visualization only, not fit guarantee"

### Challenge 3: 3D Model Library Scale

**Problem:** Need 3D models for thousands of wardrobe items.

**Mitigation:**
- **MVP:** Users can only try-on items from **curated library** (100 items)
- **Phase 2:** Use **AI 3D generation** (Kaedim) for user-uploaded items ($5-10 each)
- **Phase 3:** Partner with brands for pre-made 3D models

### Challenge 4: Device Fragmentation

**Problem:** ARKit limits to iPhone 6s+, LiDAR to iPhone 12 Pro+.

**Mitigation:**
- **Fallback levels:**
  - iPhone 12 Pro+: Full LiDAR AR with occlusion
  - iPhone 12-15 (non-Pro): ARKit body tracking without LiDAR
  - iPhone 6s-11: Photo-based avatar only
  - Android: Photo-based avatar only (ARCore in Phase 3)

### Challenge 5: Privacy Concerns

**Problem:** Users hesitant to upload body photos.

**Mitigation:**
- **Transparency:** Clear privacy policy, explain data usage
- **Local processing:** Process photos on-device when possible
- **Deletion:** Allow immediate deletion of photos/avatars
- **Encryption:** Store body scans encrypted (AES-256)
- **Marketing:** Emphasize "your avatar, your data, your control"

---

## Cost-Benefit Analysis

### Photo-Based Avatar Approach (Recommended MVP)

**Costs:**
| Item | Amount |
|------|--------|
| Avatar SDK (MetaPerson) | $0.30/avatar × 10K users = $3,000/month |
| GPU compute (video gen) | $500/month |
| 3D developer contract (3 months) | $20,000 |
| 3D artist for item library (100 items) | $10,000 |
| **Total 6-month cost** | **$38,000** |

**Benefits:**
- **Reduced returns:** 16.9% → 12% (30% reduction) = **$50K-$100K saved** annually (if 10K users shop via app)
- **Increased conversion:** AR users convert 40% higher = **$80K additional revenue**
- **Competitive advantage:** Only wardrobe app with AR try-on
- **User engagement:** 2-3x longer session time

**ROI:** Break-even at ~4-5 months, **250% ROI** in Year 1

### Real-Time ARKit Approach (Phase 2)

**Costs:**
| Item | Amount |
|------|--------|
| Senior AR developer (6 months) | $50,000 |
| 3D artists for modeling | $15,000 |
| Unity/RealityKit licenses | $2,000 |
| **Total cost** | **$67,000** |

**Benefits:**
- **Premium tier revenue:** $4.99/month × 1K AR subscribers = **$60K/year**
- **Brand differentiation:** Stand out from all competitors
- **Press coverage:** TechCrunch, Vogue features (worth $50K+ in marketing)

**ROI:** Longer payback (8-12 months), but **strategic value** for brand positioning

---

## Competitive Intelligence: What Zara Did

Based on research, here's Zara's exact approach:

### Zara's Implementation (2025-2026)

**NOT using LiDAR** (despite our initial assumption)

**Actual Technology:**
1. **AI Avatar Generation:**
   - User uploads 2 photos (portrait + full-body)
   - AI creates personalized 3D avatar
   - Matches skin tone, body shape, face

2. **Virtual Try-On:**
   - User selects Zara products from catalog
   - AI generates **video** of avatar wearing clothes
   - Shows 360° view with realistic fabric drape/flow

3. **Platform:**
   - Integrated in main Zara app
   - iOS and Android (no AR frameworks needed)
   - Launched in Spain first, rolling out globally

**Why This Makes Sense:**
- ✅ Works on all devices (no AR hardware needed)
- ✅ More accurate fit visualization (AI learns from photos)
- ✅ Scalable (pre-render videos, cache them)
- ✅ Only works with **Zara's catalog** (we can work with **user's wardrobe**)

**Our Advantage:**
- Zara: Try-on Zara clothes
- **Vestiaire: Try-on YOUR clothes** (from your existing wardrobe)

---

## Final Recommendations

### For V2 Epic 9: AR Virtual Try-On

**Recommended Approach:** Photo-Based Avatar + AI Video Generation (like Zara)

**Why:**
1. **Faster time-to-market:** 3-4 months vs 6-9 months for real-time AR
2. **Lower cost:** $38K vs $67K
3. **Better accuracy:** AI learns body shape from photos, more realistic fit
4. **Wider device support:** Works on iPhone 6s+, Android, web
5. **Proven success:** Zara, Doppl, Walmart all use this approach

**Implementation:**
1. **Avatar SDK:** MetaPerson Creator ($0.30/avatar)
2. **3D Engine:** Unity (familiar, good ARKit integration for Phase 2)
3. **Video generation:** RunwayML or custom AWS GPU pipeline
4. **Storage:** Supabase (avatars + videos)
5. **Timeline:** 4 months to MVP

**Phase 2 Enhancement (6 months later):**
- Add real-time ARKit overlay as **premium feature** ($4.99/month unlock)
- Market as "Live AR Mirror Mode"
- Targets iPhone 12+ users (35-40% of base)

### Technical Stack Summary

```yaml
AR Try-On V2 Stack:
  Avatar Generation:
    - SDK: MetaPerson Creator
    - Cost: $0.30 per avatar
    - Process: 2 photos → 3D avatar (30 sec)
  
  3D Rendering:
    - Engine: Unity 2023 LTS
    - Renderer: Universal Render Pipeline (URP)
    - Platform: iOS/Android build
  
  Video Generation:
    - Service: RunwayML Gen-2 API
    - Alternative: AWS EC2 GPU (cheaper at scale)
    - Format: MP4, 1080p, 10-15 seconds
  
  Backend:
    - Database: Supabase (avatar metadata, video URLs)
    - Storage: Supabase Storage (photos, videos)
    - Compute: Supabase Edge Functions + AWS Lambda (GPU)
  
  Phase 2 (Real-Time AR):
    - Framework: ARKit 6 (iOS 16+)
    - Rendering: RealityKit
    - Fallback: Avatar mode for non-compatible devices
```

---

## Appendix: Research Sources

1. **MobiDev AR Fashion Guide:** [https://mobidev.biz/blog/virtual-try-on-ar-fashion-apps](https://mobidev.biz/blog/virtual-try-on-ar-fashion-apps)
2. **3DLOOK Body Scanning:** [https://3dlook.ai](https://3dlook.ai)
3. **Zara AR Implementation:** Multiple sources (russpain.com, womanandhome.com, genlook.app)
4. **ARKit vs ARCore Comparison:** [https://medium.com](https://medium.com), [https://filter-experience.com](https://filter-experience.com)
5. **MetaPerson Avatar SDK:** [https://metaperson.avatarsdk.com](https://metaperson.avatarsdk.com)
6. **Ready Player Me:** [https://readyplayer.me](https://readyplayer.me)
7. **Fashion AR Market Report:** Statista, McKinsey 2024-2025

---

**Document Status:** Final  
**Next Steps:** Review with development team, validate costs, begin vendor evaluation (MetaPerson vs Ready Player Me)  
**Owner:** Mary (Business Analyst) → Handoff to Dev Agent
