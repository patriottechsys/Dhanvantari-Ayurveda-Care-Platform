"use client";

import { useState } from "react";
import {
  Search,
  Clock,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Play,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoPlayerModal, VideoThumbnail } from "@/components/video-player-modal";
import type { VideoReference } from "@/lib/video-helpers";

/* ─────────────────────── Types ─────────────────────── */

type DoshaEffect = "Balances" | "Increases" | "Reduces" | "Neutral";

type YogaAsana = {
  id: number;
  name: string;
  sanskrit_name: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  dosha_effect: {
    vata: DoshaEffect;
    pitta: DoshaEffect;
    kapha: DoshaEffect;
  };
  good_for_doshas: string[];
  avoid_doshas: string | null;
  therapeutic_focus: string[];
  duration: string;
  hold_time?: string | null;
  repetitions?: string | null;
  description: string;
  instructions: string[];
  modifications: string[];
  contraindications: string[];
  is_sequence: boolean;
  videos: VideoReference[];
};

/* ─────────────────────── Constants ─────────────────────── */

const CATEGORIES = [
  "All",
  "Standing",
  "Seated",
  "Supine",
  "Prone",
  "Inversion",
  "Twist",
  "Balance",
  "Forward Bend",
  "Backbend",
  "Hip Opener",
  "Restorative",
  "Warm-Up",
];

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];
const DOSHAS = ["All", "Vata", "Pitta", "Kapha"];

const LEVEL_COLOR: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-800",
  Intermediate: "bg-amber-100 text-amber-800",
  Advanced: "bg-red-100 text-red-800",
};

const CATEGORY_ICON: Record<string, string> = {
  Standing: "\uD83E\uDDCD",
  Seated: "\uD83E\uDEB7",
  Supine: "\uD83D\uDECC",
  Prone: "\uD83E\uDDD8",
  Inversion: "\uD83E\uDD38",
  Twist: "\uD83D\uDD04",
  Balance: "\uD83C\uDF33",
  "Forward Bend": "\uD83D\uDE47",
  Backbend: "\uD83E\uDD38",
  "Hip Opener": "\uD83E\uDDB5",
  Restorative: "\uD83D\uDE4F",
  "Warm-Up": "\u2600\uFE0F",
};

/* ─────────────────────── Seed Data ─────────────────────── */

const YOGA_DATA: YogaAsana[] = [
  {
    id: 1,
    name: "Mountain Pose",
    sanskrit_name: "Tadasana",
    category: "Standing",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Balances", kapha: "Balances" },
    good_for_doshas: ["Vata", "Pitta", "Kapha"],
    avoid_doshas: null,
    therapeutic_focus: ["Posture", "Grounding", "Awareness"],
    duration: "30 sec \u2013 1 min",
    hold_time: "5\u201310 breaths",
    description: "Foundation standing pose that establishes alignment and grounding. Calms Vata through stability.",
    instructions: [
      "Stand with feet together or hip-width apart, arms at sides",
      "Spread toes wide and press evenly through all four corners of feet",
      "Engage thighs, draw tailbone down, lift through the crown of head",
      "Roll shoulders back and down, palms facing forward",
      "Breathe deeply, feeling grounded and tall",
    ],
    modifications: ["Widen stance for more stability", "Stand against a wall for alignment feedback"],
    contraindications: ["Severe dizziness"],
    is_sequence: false,
    videos: [
      {
        id: "yv1",
        title: "Mountain Pose (Tadasana) Tutorial",
        url: "https://www.youtube.com/watch?v=2HTvZp5rPrg",
        platform: "youtube",
        embedUrl: "https://www.youtube.com/embed/2HTvZp5rPrg",
        thumbnailUrl: "https://img.youtube.com/vi/2HTvZp5rPrg/hqdefault.jpg",
        durationDisplay: "3:45",
        language: "English",
        sourceName: "Yoga With Adriene",
        isPrimary: true,
      },
    ],
  },
  {
    id: 2,
    name: "Cobra Pose",
    sanskrit_name: "Bhujangasana",
    category: "Prone",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Increases", kapha: "Reduces" },
    good_for_doshas: ["Kapha", "Vata"],
    avoid_doshas: "Pitta (hold briefly, avoid overheating)",
    therapeutic_focus: ["Back Pain", "Digestion", "Chest Opening", "Fatigue"],
    duration: "15\u201330 sec",
    hold_time: "3\u20135 breaths",
    description: "Gentle backbend that stimulates digestive fire (Agni) and opens the chest. Excellent for reducing Kapha stagnation.",
    instructions: [
      "Lie face down with legs extended, tops of feet on the floor",
      "Place palms under shoulders, elbows close to body",
      "Press tops of feet and thighs into the floor",
      "Inhale, slowly lift chest off the floor using back muscles",
      "Keep elbows slightly bent, shoulders away from ears",
      "Hold for 3\u20135 breaths, then slowly lower on exhale",
    ],
    modifications: [
      "Sphinx Pose (forearms down) for gentler version",
      "Use a bolster under the pelvis for support",
    ],
    contraindications: ["Pregnancy", "Severe back injury", "Carpal tunnel syndrome"],
    is_sequence: false,
    videos: [
      {
        id: "yv2",
        title: "Cobra Pose for Beginners",
        url: "https://www.youtube.com/watch?v=JDcdhTuycOI",
        platform: "youtube",
        embedUrl: "https://www.youtube.com/embed/JDcdhTuycOI",
        thumbnailUrl: "https://img.youtube.com/vi/JDcdhTuycOI/hqdefault.jpg",
        durationDisplay: "4:32",
        language: "English",
        sourceName: "Yoga With Adriene",
        isPrimary: true,
      },
    ],
  },
  {
    id: 3,
    name: "Child's Pose",
    sanskrit_name: "Balasana",
    category: "Restorative",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Vata", "Pitta"],
    avoid_doshas: "Kapha (limit duration, stay active)",
    therapeutic_focus: ["Stress", "Anxiety", "Lower Back", "Rest"],
    duration: "1\u20135 min",
    hold_time: "10\u201320 breaths",
    description: "Deeply calming restorative pose that grounds Vata and cools Pitta. A go-to for stress and anxiety.",
    instructions: [
      "Kneel on the floor, big toes touching, knees hip-width apart",
      "Sit back on heels and fold forward, extending arms in front",
      "Rest forehead on the mat",
      "Let the entire body soften and release",
      "Breathe deeply into the back body",
    ],
    modifications: [
      "Wide-knee variation for pregnancy or belly comfort",
      "Place a bolster or pillow under torso for support",
      "Stack fists under forehead if it doesn\u2019t reach the floor",
    ],
    contraindications: ["Knee injury", "Pregnancy (use wide-knee variation)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 4,
    name: "Downward-Facing Dog",
    sanskrit_name: "Adho Mukha Svanasana",
    category: "Inversion",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Kapha", "Vata"],
    avoid_doshas: "Pitta (avoid holding too long in heat)",
    therapeutic_focus: ["Full Body Stretch", "Energy", "Hamstrings", "Shoulders"],
    duration: "30 sec \u2013 2 min",
    hold_time: "5\u201310 breaths",
    description: "Foundational inversion that energizes the body, stretches the posterior chain, and builds upper body strength.",
    instructions: [
      "Start on hands and knees, wrists under shoulders, knees under hips",
      "Tuck toes, lift knees off the floor, send hips up and back",
      "Straighten legs as much as comfortable (bend knees if needed)",
      "Press firmly through palms, rotate upper arms outward",
      "Let head hang naturally between upper arms",
      "Pedal feet to warm up hamstrings and calves",
    ],
    modifications: [
      "Bend knees generously to focus on spinal length",
      "Use blocks under hands to reduce wrist pressure",
    ],
    contraindications: ["Carpal tunnel", "Late pregnancy", "Uncontrolled high blood pressure"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 5,
    name: "Warrior I",
    sanskrit_name: "Virabhadrasana I",
    category: "Standing",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Vata", "Kapha"],
    avoid_doshas: "Pitta (avoid aggressive holds)",
    therapeutic_focus: ["Strength", "Confidence", "Hip Flexors", "Balance"],
    duration: "30 sec \u2013 1 min per side",
    hold_time: "5\u20138 breaths",
    description: "Powerful standing pose that builds heat and strength. Grounds Vata and mobilizes Kapha.",
    instructions: [
      "From standing, step left foot back 3\u20134 feet",
      "Turn back foot out 45 degrees, align front heel with back arch",
      "Bend front knee to 90 degrees, keeping knee over ankle",
      "Raise arms overhead, palms facing each other",
      "Square hips forward, lift through the chest",
      "Hold and breathe, then repeat on the other side",
    ],
    modifications: [
      "Shorten stance for better balance",
      "Keep hands on hips instead of overhead",
    ],
    contraindications: ["Heart problems", "High blood pressure (arms down variation)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 6,
    name: "Warrior II",
    sanskrit_name: "Virabhadrasana II",
    category: "Standing",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Vata", "Kapha"],
    avoid_doshas: null,
    therapeutic_focus: ["Strength", "Stamina", "Focus", "Hip Opening"],
    duration: "30 sec \u2013 1 min per side",
    hold_time: "5\u20138 breaths",
    description: "Open-hip standing warrior that builds stamina and focus. Balances all doshas when practiced mindfully.",
    instructions: [
      "From standing, step feet 3\u20134 feet apart",
      "Turn right foot out 90 degrees, left foot in slightly",
      "Raise arms parallel to the floor, palms down",
      "Bend right knee to 90 degrees, knee over ankle",
      "Gaze over right fingertips, keep torso centered",
      "Hold and breathe, then switch sides",
    ],
    modifications: [
      "Reduce depth of knee bend",
      "Rest arms down if shoulders fatigue",
    ],
    contraindications: ["Knee injury (reduce depth)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 7,
    name: "Tree Pose",
    sanskrit_name: "Vrksasana",
    category: "Balance",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Neutral", kapha: "Neutral" },
    good_for_doshas: ["Vata"],
    avoid_doshas: null,
    therapeutic_focus: ["Balance", "Focus", "Grounding", "Ankle Strength"],
    duration: "30 sec \u2013 1 min per side",
    hold_time: "5\u201310 breaths",
    description: "Single-leg balance that cultivates focus and stability. Especially grounding for aggravated Vata.",
    instructions: [
      "Stand tall in Mountain Pose",
      "Shift weight onto left foot, lift right foot off floor",
      "Place right sole on inner left thigh or calf (never on the knee)",
      "Press foot and thigh together for stability",
      "Bring hands to heart center or extend overhead",
      "Fix gaze on a steady point, breathe, then switch sides",
    ],
    modifications: [
      "Place foot on inner calf instead of thigh",
      "Keep toes on the floor, heel on ankle",
      "Stand near a wall for support",
    ],
    contraindications: ["Acute ankle/knee injury"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 8,
    name: "Seated Forward Bend",
    sanskrit_name: "Paschimottanasana",
    category: "Forward Bend",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Pitta", "Vata"],
    avoid_doshas: "Kapha (keep active, don\u2019t slump)",
    therapeutic_focus: ["Hamstrings", "Calming", "Digestion", "Lower Back"],
    duration: "1\u20133 min",
    hold_time: "10\u201315 breaths",
    description: "Calming forward fold that soothes the nervous system and stimulates digestion. Cools Pitta.",
    instructions: [
      "Sit with legs extended straight in front",
      "Flex feet, sit tall to lengthen the spine",
      "Inhale and raise arms overhead",
      "Exhale and hinge forward from the hips (not the waist)",
      "Reach for shins, ankles, or feet \u2014 wherever comfortable",
      "Keep the spine long rather than rounding",
      "Hold and breathe deeply into the back of the legs",
    ],
    modifications: [
      "Bend knees slightly if hamstrings are tight",
      "Use a strap around the feet for reach",
      "Sit on a folded blanket to tilt pelvis forward",
    ],
    contraindications: ["Herniated disc", "Sciatica (modify with bent knees)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 9,
    name: "Bridge Pose",
    sanskrit_name: "Setu Bandhasana",
    category: "Supine",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Vata", "Kapha"],
    avoid_doshas: null,
    therapeutic_focus: ["Back Strength", "Chest Opening", "Thyroid", "Fatigue"],
    duration: "30 sec \u2013 1 min",
    hold_time: "5\u201310 breaths",
    description: "Gentle backbend from supine that opens the chest, strengthens the back, and stimulates the thyroid.",
    instructions: [
      "Lie on your back, knees bent, feet hip-width apart flat on floor",
      "Place arms alongside the body, palms down",
      "Press feet and arms into the floor",
      "Inhale and lift hips toward the ceiling",
      "Roll shoulders underneath, optionally clasp hands under back",
      "Keep thighs parallel, hold and breathe",
      "Slowly lower hips on exhale, one vertebra at a time",
    ],
    modifications: [
      "Place a block under sacrum for supported bridge",
      "Keep arms by sides if shoulder clasp is uncomfortable",
    ],
    contraindications: ["Neck injury (use blanket under shoulders)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 10,
    name: "Supine Spinal Twist",
    sanskrit_name: "Supta Matsyendrasana",
    category: "Twist",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Balances", kapha: "Balances" },
    good_for_doshas: ["Vata", "Pitta", "Kapha"],
    avoid_doshas: null,
    therapeutic_focus: ["Spine Mobility", "Digestion", "Detox", "Relaxation"],
    duration: "1\u20133 min per side",
    hold_time: "10\u201315 breaths",
    description: "Tridoshic restorative twist that aids digestion, releases spinal tension, and promotes detoxification.",
    instructions: [
      "Lie on your back, hug knees to chest",
      "Extend arms out to a T-shape, palms down",
      "Drop both knees to the right side",
      "Turn head to look left (if comfortable for neck)",
      "Keep both shoulders grounded",
      "Hold for 10\u201315 breaths, then switch sides",
    ],
    modifications: [
      "Place a pillow between or under knees",
      "Keep both knees bent at 90 degrees",
    ],
    contraindications: ["Spinal disc issues (modify with both knees bent)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 11,
    name: "Legs Up the Wall",
    sanskrit_name: "Viparita Karani",
    category: "Restorative",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Vata", "Pitta"],
    avoid_doshas: "Kapha (limit to 5 min)",
    therapeutic_focus: ["Circulation", "Anxiety", "Insomnia", "Swollen Legs"],
    duration: "5\u201315 min",
    hold_time: "As comfortable",
    description: "Deeply calming inversion that reverses blood flow, reduces anxiety, and promotes sleep. Essential Vata remedy.",
    instructions: [
      "Sit sideways next to a wall",
      "Swing legs up the wall as you lower your back to the floor",
      "Scoot hips as close to the wall as comfortable",
      "Rest arms by your sides or on belly, palms up",
      "Close eyes and breathe naturally",
      "Stay for 5\u201315 minutes",
      "To exit, bend knees and roll to one side",
    ],
    modifications: [
      "Place a folded blanket under hips for slight elevation",
      "Move hips a few inches from wall if hamstrings are tight",
    ],
    contraindications: ["Glaucoma", "Severe neck problems", "Menstruation (per tradition)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 12,
    name: "Cat-Cow Stretch",
    sanskrit_name: "Marjaryasana-Bitilasana",
    category: "Warm-Up",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Balances", kapha: "Balances" },
    good_for_doshas: ["Vata", "Pitta", "Kapha"],
    avoid_doshas: null,
    therapeutic_focus: ["Spine Flexibility", "Warm-Up", "Breath Coordination", "Back Pain"],
    duration: "1\u20133 min",
    hold_time: null,
    repetitions: "8\u201312 rounds",
    description: "Tridoshic spinal warm-up that synchronizes breath with movement. Gently mobilizes the entire spine.",
    instructions: [
      "Start on hands and knees, wrists under shoulders, knees under hips",
      "Cow: Inhale, drop belly, lift chest and tailbone, look up",
      "Cat: Exhale, round spine toward ceiling, tuck chin to chest",
      "Move slowly with breath, feeling each vertebra",
      "Repeat 8\u201312 rounds",
    ],
    modifications: [
      "Place a blanket under knees for cushioning",
      "Keep head neutral if you have neck issues",
    ],
    contraindications: ["Severe neck injury (keep head neutral)"],
    is_sequence: true,
    videos: [],
  },
  {
    id: 13,
    name: "Corpse Pose",
    sanskrit_name: "Savasana",
    category: "Restorative",
    level: "Beginner",
    dosha_effect: { vata: "Balances", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Vata", "Pitta"],
    avoid_doshas: "Kapha (limit to 5\u201310 min, use guided visualization)",
    therapeutic_focus: ["Deep Relaxation", "Nervous System Reset", "Insomnia", "Stress"],
    duration: "5\u201320 min",
    hold_time: "As needed",
    description: "Final relaxation pose. Integrates the practice, calms the nervous system, and restores balance.",
    instructions: [
      "Lie flat on your back, legs extended, feet falling open",
      "Place arms alongside body, palms facing up",
      "Close your eyes and release all muscular effort",
      "Scan the body from head to toe, releasing tension",
      "Breathe naturally and let go completely",
      "Stay for 5\u201320 minutes",
      "To exit, wiggle fingers and toes, roll to right side, slowly sit up",
    ],
    modifications: [
      "Place bolster under knees for lower back comfort",
      "Cover with a blanket if you feel cold",
      "Use an eye pillow for deeper relaxation",
    ],
    contraindications: ["Lower back pain (place bolster under knees)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 14,
    name: "Triangle Pose",
    sanskrit_name: "Trikonasana",
    category: "Standing",
    level: "Intermediate",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Kapha", "Vata"],
    avoid_doshas: "Pitta (avoid overexertion in heat)",
    therapeutic_focus: ["Side Body Stretch", "Hip Opening", "Balance", "Digestion"],
    duration: "30 sec \u2013 1 min per side",
    hold_time: "5\u20138 breaths",
    description: "Deep lateral stretch that opens the side body, strengthens the legs, and stimulates abdominal organs.",
    instructions: [
      "Stand with feet 3\u20134 feet apart",
      "Turn right foot out 90 degrees, left foot in slightly",
      "Extend arms parallel to the floor",
      "Reach right hand forward, then hinge at the hip to lower right hand to shin, ankle, or floor",
      "Extend left arm straight up, stacking shoulders",
      "Gaze up at left hand (or down if neck is sensitive)",
      "Hold and breathe, then switch sides",
    ],
    modifications: [
      "Use a block under bottom hand",
      "Look down instead of up for neck comfort",
    ],
    contraindications: ["Low blood pressure", "Neck injury (look down instead of up)"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 15,
    name: "Half Lord of the Fishes",
    sanskrit_name: "Ardha Matsyendrasana",
    category: "Twist",
    level: "Intermediate",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Kapha", "Vata"],
    avoid_doshas: null,
    therapeutic_focus: ["Digestion", "Spinal Rotation", "Detox", "Liver"],
    duration: "30 sec \u2013 1 min per side",
    hold_time: "5\u20138 breaths",
    description: "Powerful seated twist that wrings out the abdominal organs, stimulates Agni, and promotes detoxification.",
    instructions: [
      "Sit with legs extended, then bend right knee and cross right foot over left thigh",
      "Optionally bend left knee, bringing left heel near right hip",
      "Place right hand behind you for support",
      "Hook left elbow outside right knee",
      "Inhale to lengthen spine, exhale to twist deeper",
      "Keep both sit bones grounded",
      "Hold for 5\u20138 breaths, then switch sides",
    ],
    modifications: [
      "Keep bottom leg straight if hips are tight",
      "Use a blanket under sit bones for elevation",
    ],
    contraindications: ["Spinal injury", "Pregnancy"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 16,
    name: "Pigeon Pose",
    sanskrit_name: "Eka Pada Rajakapotasana",
    category: "Hip Opener",
    level: "Intermediate",
    dosha_effect: { vata: "Reduces", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Vata", "Pitta"],
    avoid_doshas: null,
    therapeutic_focus: ["Hip Opening", "Emotional Release", "Sciatica", "Lower Back"],
    duration: "1\u20133 min per side",
    hold_time: "10\u201315 breaths",
    description: "Deep hip opener that releases stored tension and emotion. Calms Vata and cools Pitta when held restoratively.",
    instructions: [
      "From Downward Dog, bring right knee forward behind right wrist",
      "Slide left leg back, keeping hips square",
      "Walk hands forward, lowering torso over front shin",
      "Rest forehead on stacked fists or the floor",
      "Breathe deeply into the hip and outer glute",
      "Hold 1\u20133 minutes, then switch sides",
    ],
    modifications: [
      "Place a block or blanket under the hip of the front leg",
      "Reclined Pigeon (Figure-4) for a gentler alternative",
    ],
    contraindications: ["Knee injury", "Sacroiliac dysfunction"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 17,
    name: "Shoulder Stand",
    sanskrit_name: "Sarvangasana",
    category: "Inversion",
    level: "Intermediate",
    dosha_effect: { vata: "Neutral", pitta: "Reduces", kapha: "Reduces" },
    good_for_doshas: ["Pitta", "Kapha"],
    avoid_doshas: "Vata (support with blankets, limit duration)",
    therapeutic_focus: ["Thyroid", "Circulation", "Calming", "Hormonal Balance"],
    duration: "1\u20135 min",
    hold_time: "10\u201325 breaths",
    description: "Queen of asanas. Stimulates thyroid, reverses circulation, and deeply calms the mind. Primarily cools Pitta.",
    instructions: [
      "Lie on your back with arms alongside body",
      "Lift legs overhead, supporting lower back with hands",
      "Walk hands higher up the back for more support",
      "Straighten legs toward the ceiling",
      "Keep weight on shoulders and upper arms (not neck)",
      "Breathe steadily, hold for 1\u20135 minutes",
      "To exit, slowly lower legs overhead, then roll down vertebra by vertebra",
    ],
    modifications: [
      "Use 2\u20133 folded blankets under shoulders to protect neck",
      "Supported version: keep hips in hands, legs at an angle",
    ],
    contraindications: ["Neck injury", "High blood pressure", "Menstruation", "Glaucoma", "Pregnancy"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 18,
    name: "Headstand",
    sanskrit_name: "Sirsasana",
    category: "Inversion",
    level: "Advanced",
    dosha_effect: { vata: "Increases", pitta: "Increases", kapha: "Reduces" },
    good_for_doshas: ["Kapha"],
    avoid_doshas: "Vata (destabilizing), Pitta (overheating if held long)",
    therapeutic_focus: ["Focus", "Circulation", "Core Strength", "Confidence"],
    duration: "30 sec \u2013 5 min",
    hold_time: "10\u201325 breaths",
    description: "King of asanas. Powerful inversion that builds focus and core strength. Best suited for Kapha constitution.",
    instructions: [
      "Kneel and interlace fingers, placing forearms on the floor",
      "Place crown of head on the floor, cradled by hands",
      "Tuck toes and lift knees, walking feet closer to head",
      "Engage core and slowly lift legs overhead",
      "Stack hips over shoulders over head",
      "Press forearms down, lift through legs",
      "Hold for 10\u201325 breaths, lower with control",
    ],
    modifications: [
      "Practice against a wall for safety",
      "Tripod headstand as an alternative entry",
      "Practice dolphin pose to build shoulder strength first",
    ],
    contraindications: ["Neck injury", "High blood pressure", "Heart conditions", "Glaucoma", "Pregnancy", "Menstruation"],
    is_sequence: false,
    videos: [],
  },
  {
    id: 19,
    name: "Sun Salutation A",
    sanskrit_name: "Surya Namaskar A",
    category: "Warm-Up",
    level: "Beginner",
    dosha_effect: { vata: "Reduces", pitta: "Neutral", kapha: "Reduces" },
    good_for_doshas: ["Kapha", "Vata"],
    avoid_doshas: "Pitta (practice slowly, avoid midday heat)",
    therapeutic_focus: ["Full Body Warm-Up", "Energy", "Flexibility", "Cardio"],
    duration: "5\u201315 min",
    hold_time: null,
    repetitions: "3\u201312 rounds",
    description: "Classical flowing sequence that warms the entire body, builds energy, and connects breath to movement.",
    instructions: [
      "Mountain Pose \u2014 hands at heart",
      "Inhale: reach arms overhead (Urdhva Hastasana)",
      "Exhale: forward fold (Uttanasana)",
      "Inhale: halfway lift (Ardha Uttanasana)",
      "Exhale: step/jump back to plank, lower to Chaturanga",
      "Inhale: Upward-Facing Dog (Urdhva Mukha Svanasana)",
      "Exhale: Downward-Facing Dog \u2014 hold for 5 breaths",
      "Inhale: step/jump to front of mat, halfway lift",
      "Exhale: forward fold",
      "Inhale: rise to standing, arms overhead",
      "Exhale: hands to heart \u2014 one round complete",
    ],
    modifications: [
      "Step instead of jumping",
      "Lower knees in plank/Chaturanga",
      "Use Cobra instead of Upward Dog",
    ],
    contraindications: ["Severe back injury", "Uncontrolled high blood pressure"],
    is_sequence: true,
    videos: [
      {
        id: "yv19",
        title: "Sun Salutation A \u2014 Step by Step",
        url: "https://www.youtube.com/watch?v=73sjOu0g58M",
        platform: "youtube",
        embedUrl: "https://www.youtube.com/embed/73sjOu0g58M",
        thumbnailUrl: "https://img.youtube.com/vi/73sjOu0g58M/hqdefault.jpg",
        durationDisplay: "12:08",
        language: "English",
        sourceName: "Yoga With Adriene",
        isPrimary: true,
      },
    ],
  },
  {
    id: 20,
    name: "Moon Salutation",
    sanskrit_name: "Chandra Namaskar",
    category: "Warm-Up",
    level: "Intermediate",
    dosha_effect: { vata: "Reduces", pitta: "Reduces", kapha: "Neutral" },
    good_for_doshas: ["Pitta", "Vata"],
    avoid_doshas: "Kapha (too cooling/slow)",
    therapeutic_focus: ["Cooling", "Feminine Energy", "Hip Opening", "Evening Practice"],
    duration: "5\u201315 min",
    hold_time: null,
    repetitions: "3\u20136 rounds",
    description: "Cooling counterpart to Sun Salutation. Lateral movements open the hips and side body. Ideal for Pitta constitutions or evening practice.",
    instructions: [
      "Mountain Pose \u2014 hands at heart center",
      "Inhale: reach arms overhead, side bend right",
      "Exhale: return to center, side bend left",
      "Inhale: center. Exhale: Goddess Squat (Utkata Konasana)",
      "Inhale: Triangle Pose right. Exhale: Pyramid Pose right",
      "Inhale: low lunge right. Exhale: wide squat center",
      "Repeat sequence on left side",
      "Return to Mountain Pose \u2014 one round complete",
    ],
    modifications: [
      "Reduce depth of lunges and squats",
      "Use blocks for Triangle and Pyramid poses",
    ],
    contraindications: ["Knee injury (modify lunges)"],
    is_sequence: true,
    videos: [],
  },
];

/* ─────────────────────── Component ─────────────────────── */

export default function YogaPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [doshaFilter, setDoshaFilter] = useState("All");
  const [selectedAsana, setSelectedAsana] = useState<YogaAsana | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoReference | null>(null);

  const filtered = YOGA_DATA.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.sanskrit_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || a.category === category;
    const matchesLevel = level === "All" || a.level === level;
    const matchesDosha =
      doshaFilter === "All" || a.good_for_doshas.includes(doshaFilter);
    return matchesSearch && matchesCategory && matchesLevel && matchesDosha;
  });

  /* ── Detail View ── */
  if (selectedAsana) {
    const a = selectedAsana;
    return (
      <div className="p-6 space-y-5 max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => setSelectedAsana(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Library
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
            {CATEGORY_ICON[a.category] || "\uD83E\uDDD8"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{a.name}</h1>
            <p className="text-base text-muted-foreground italic">{a.sanskrit_name}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{a.category}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[a.level]}`}>
                {a.level}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {a.duration}
              </span>
              {a.hold_time && (
                <span className="text-xs text-muted-foreground">
                  {a.hold_time}
                </span>
              )}
              {a.repetitions && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RotateCcw className="size-3" />
                  {a.repetitions}
                </span>
              )}
              {a.is_sequence && (
                <Badge variant="default" className="text-xs">Sequence</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{a.description}</p>

        {/* Dosha Effects */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">Dosha Effects</h3>
          <div className="flex gap-3 flex-wrap">
            {(["vata", "pitta", "kapha"] as const).map((d) => (
              <span key={d} className="text-xs">
                <span className="font-medium capitalize">{d}:</span>{" "}
                <span className="text-muted-foreground">{a.dosha_effect[d]}</span>
              </span>
            ))}
          </div>
          <div className="text-xs">
            <span className="text-emerald-700">Good for: {a.good_for_doshas.join(", ")}</span>
          </div>
          {a.avoid_doshas && (
            <div className="text-xs text-amber-700">
              Caution: {a.avoid_doshas}
            </div>
          )}
        </div>

        {/* Therapeutic Focus */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Therapeutic Focus</h3>
          <div className="flex gap-1.5 flex-wrap">
            {a.therapeutic_focus.map((t) => (
              <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Instructions</h3>
          <ol className="space-y-1.5">
            {a.instructions.map((step, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2.5">
                <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Modifications */}
        {a.modifications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Modifications</h3>
            <ul className="space-y-1">
              {a.modifications.map((m, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary mt-0.5 shrink-0">&bull;</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contraindications */}
        {a.contraindications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Contraindications
            </h3>
            <div className="flex gap-2 flex-wrap">
              {a.contraindications.map((c) => (
                <span key={c} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {a.videos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Videos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {a.videos.map((v) => (
                <VideoThumbnail
                  key={v.id}
                  video={v}
                  onClick={() => setActiveVideo(v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      </div>
    );
  }

  /* ── Library View ── */
  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yoga Library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {filtered.length} yoga asanas &mdash; assign to patients or use as reference
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search yoga asanas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All categories" : c}
            </option>
          ))}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="w-36">
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l === "All" ? "All levels" : l}
            </option>
          ))}
        </Select>
        <Select value={doshaFilter} onChange={(e) => setDoshaFilter(e.target.value)} className="w-40">
          {DOSHAS.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All doshas" : `Good for ${d}`}
            </option>
          ))}
        </Select>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => setSelectedAsana(a)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-sm">
                  {CATEGORY_ICON[a.category] || "\uD83E\uDDD8"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground italic">{a.sanskrit_name}</p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {a.category}
              </Badge>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[a.level]}`}>
                {a.level}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {a.duration}
              </span>
              {a.hold_time && (
                <span className="text-xs text-muted-foreground">{a.hold_time}</span>
              )}
              {a.repetitions && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RotateCcw className="size-3" />
                  {a.repetitions}
                </span>
              )}
            </div>

            {/* Dosha info */}
            <div className="space-y-0.5">
              <p className="text-xs text-emerald-700">Good for: {a.good_for_doshas.join(", ")}</p>
              {a.avoid_doshas && (
                <p className="text-xs text-amber-700">Avoid: {a.avoid_doshas}</p>
              )}
            </div>

            {/* Therapeutic focus */}
            <div className="flex gap-1 flex-wrap">
              {a.therapeutic_focus.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t}</span>
              ))}
              {a.therapeutic_focus.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{a.therapeutic_focus.length - 3}</span>
              )}
            </div>

            {/* Video indicator */}
            {a.videos.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <span className="size-3.5 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="border-l-[5px] border-l-primary border-y-[3px] border-y-transparent ml-0.5 size-0" />
                </span>
                {a.videos.length} video{a.videos.length > 1 ? "s" : ""}
              </div>
            )}

            {/* Sequence badge */}
            {a.is_sequence && (
              <Badge variant="default" className="text-[10px]">Sequence / Flow</Badge>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No yoga asanas match your search.
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </div>
  );
}
