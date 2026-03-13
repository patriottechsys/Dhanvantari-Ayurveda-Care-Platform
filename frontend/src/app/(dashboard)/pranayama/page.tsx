"use client";

import { useState } from "react";
import { Search, Clock, Wind, Flame, Droplets, Zap, Heart, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { VideoPlayerModal, VideoThumbnail } from "@/components/video-player-modal";
import type { VideoReference } from "@/lib/video-helpers";

type Pranayama = {
  id: number;
  name: string;
  name_sanskrit: string;
  category: string;
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  dosha_effect: string;
  description: string;
  benefits: string[];
  technique: string[];
  contraindications?: string;
  best_time?: string;
  icon: "wind" | "flame" | "droplets" | "zap" | "heart" | "moon" | "sun";
  videos?: VideoReference[];
};

const ICON_MAP = {
  wind: Wind,
  flame: Flame,
  droplets: Droplets,
  zap: Zap,
  heart: Heart,
  moon: Moon,
  sun: Sun,
};

const PRANAYAMA_DATA: Pranayama[] = [
  {
    id: 1,
    name: "Alternate Nostril Breathing",
    name_sanskrit: "Nadi Shodhana",
    category: "Balancing",
    duration: "5–15 min",
    difficulty: "Beginner",
    dosha_effect: "Balances all three doshas, especially calms Vata and Pitta",
    description:
      "A foundational pranayama that purifies the energy channels (nadis) by alternating breath between nostrils. Creates deep mental calm and nervous system balance.",
    benefits: [
      "Calms the nervous system",
      "Balances left and right brain hemispheres",
      "Reduces anxiety and stress",
      "Improves focus and clarity",
      "Prepares the mind for meditation",
    ],
    technique: [
      "Sit comfortably with spine erect",
      "Use right thumb to close right nostril",
      "Inhale slowly through left nostril (4 counts)",
      "Close left nostril with ring finger, release right",
      "Exhale through right nostril (4 counts)",
      "Inhale through right nostril (4 counts)",
      "Close right, exhale through left — this is one round",
      "Repeat 9–12 rounds",
    ],
    best_time: "Morning or evening, on an empty stomach",
    icon: "wind",
  },
  {
    id: 2,
    name: "Skull Shining Breath",
    name_sanskrit: "Kapalabhati",
    category: "Energizing",
    duration: "3–10 min",
    difficulty: "Intermediate",
    dosha_effect: "Reduces Kapha, stimulates Pitta — avoid if Vata is aggravated",
    description:
      "A powerful cleansing technique (kriya) with rapid, forceful exhales and passive inhales. Clears the sinuses, energizes the body, and stokes the digestive fire (agni).",
    benefits: [
      "Clears sinuses and respiratory passages",
      "Stimulates digestive fire (agni)",
      "Increases energy and alertness",
      "Detoxifies the lungs",
      "Strengthens abdominal muscles",
    ],
    technique: [
      "Sit tall with hands on knees",
      "Take a deep breath in",
      "Exhale sharply through the nose, pulling navel toward spine",
      "Let the inhale happen passively",
      "Start with 30 rapid exhales per round",
      "Rest between rounds with natural breathing",
      "Do 3 rounds, increasing to 60–120 exhales as you progress",
    ],
    contraindications: "Avoid during pregnancy, hypertension, heart disease, acid reflux, or menstruation",
    best_time: "Morning, on an empty stomach",
    icon: "flame",
  },
  {
    id: 3,
    name: "Ocean Breath",
    name_sanskrit: "Ujjayi",
    category: "Calming",
    duration: "5–20 min",
    difficulty: "Beginner",
    dosha_effect: "Calms Pitta and Vata, mildly increases Kapha",
    description:
      "A gentle, audible breath created by slightly constricting the throat. The soft ocean-like sound anchors awareness and regulates the nervous system.",
    benefits: [
      "Soothes the nervous system",
      "Builds internal heat gently",
      "Enhances concentration",
      "Slows and deepens the breath",
      "Excellent accompaniment to asana practice",
    ],
    technique: [
      "Sit or practice during yoga asanas",
      "Slightly constrict the back of the throat (like fogging a mirror)",
      "Breathe in slowly through the nose — listen for a gentle ocean sound",
      "Exhale through the nose with the same soft constriction",
      "Keep the breath smooth and even",
      "Maintain for the duration of your practice",
    ],
    best_time: "Any time; pairs well with yoga asana",
    icon: "droplets",
  },
  {
    id: 4,
    name: "Bellows Breath",
    name_sanskrit: "Bhastrika",
    category: "Energizing",
    duration: "3–5 min",
    difficulty: "Advanced",
    dosha_effect: "Balances all doshas when practiced moderately; strongly reduces Kapha",
    description:
      "An intense, rhythmic breathing technique where both inhale and exhale are forceful. Like stoking a bellows to ignite a forge, it powerfully oxygenates and energizes the entire system.",
    benefits: [
      "Dramatically increases prana (vital energy)",
      "Clears energy blockages",
      "Strengthens lungs and diaphragm",
      "Boosts metabolism and circulation",
      "Sharpens mental focus",
    ],
    technique: [
      "Sit with spine tall, hands in fists near shoulders",
      "Inhale deeply, raising arms overhead and opening fists",
      "Exhale forcefully through the nose, pulling arms back down",
      "Both inhale and exhale are powerful and rhythmic",
      "Start with 10 breaths per round",
      "Rest with normal breathing between rounds",
      "Do 3 rounds, building up gradually",
    ],
    contraindications: "Avoid during pregnancy, hypertension, heart conditions, epilepsy, or hernia",
    best_time: "Morning, before meditation",
    icon: "zap",
  },
  {
    id: 5,
    name: "Cooling Breath",
    name_sanskrit: "Sheetali",
    category: "Cooling",
    duration: "5–10 min",
    difficulty: "Beginner",
    dosha_effect: "Strongly reduces Pitta; may aggravate Kapha and Vata in excess",
    description:
      "A cooling pranayama where air is drawn in through a curled tongue (or through the teeth in Sheetkari variation). Ideal for reducing heat, anger, and inflammation.",
    benefits: [
      "Cools the body and mind",
      "Reduces Pitta-related conditions (acidity, inflammation)",
      "Lowers blood pressure gently",
      "Calms anger and emotional heat",
      "Beneficial in hot weather",
    ],
    technique: [
      "Sit comfortably with eyes softly closed",
      "Curl the tongue into a tube (or clench teeth for Sheetkari)",
      "Inhale slowly through the curled tongue — feel the cool air",
      "Close the mouth and exhale slowly through the nose",
      "Repeat 15–20 rounds",
      "Notice the cooling sensation spreading through the body",
    ],
    contraindications: "Avoid in cold weather, if you have a cold or congestion, or low blood pressure",
    best_time: "Midday or whenever overheated",
    icon: "moon",
  },
  {
    id: 6,
    name: "Humming Bee Breath",
    name_sanskrit: "Bhramari",
    category: "Calming",
    duration: "5–10 min",
    difficulty: "Beginner",
    dosha_effect: "Calms Vata and Pitta; balances the mind",
    description:
      "A deeply soothing practice where you produce a humming sound during exhalation. The vibration resonates through the skull, calming the mind almost instantly.",
    benefits: [
      "Instantly reduces stress and anxiety",
      "Relieves tension headaches",
      "Improves sleep quality",
      "Lowers blood pressure",
      "Enhances concentration for meditation",
    ],
    technique: [
      "Sit with spine erect, eyes closed",
      "Place index fingers gently on the tragus (ear cartilage)",
      "Inhale deeply through the nose",
      "Exhale making a steady, low humming sound (like a bee)",
      "Feel the vibration in the forehead and skull",
      "Continue for 7–11 rounds",
      "Sit in silence afterward to absorb the effect",
    ],
    best_time: "Evening, before sleep, or when anxious",
    icon: "heart",
  },
  {
    id: 7,
    name: "Victorious Breath",
    name_sanskrit: "Surya Bhedana",
    category: "Energizing",
    duration: "5–10 min",
    difficulty: "Intermediate",
    dosha_effect: "Increases Pitta (digestive fire); reduces Kapha and Vata",
    description:
      "Breathing exclusively through the right (solar) nostril to activate the Pingala nadi. Builds warmth, stimulates digestion, and increases vitality.",
    benefits: [
      "Stimulates digestive fire (agni)",
      "Increases body warmth",
      "Boosts energy and motivation",
      "Clears Kapha congestion",
      "Activates the sympathetic nervous system",
    ],
    technique: [
      "Sit in a comfortable posture",
      "Close the left nostril with ring finger",
      "Inhale slowly and deeply through the right nostril",
      "Close both nostrils and hold briefly (optional)",
      "Release left nostril and exhale through it",
      "Repeat — always inhale right, exhale left",
      "Practice 10–15 rounds",
    ],
    contraindications: "Avoid if Pitta is aggravated, during fever, or with hypertension",
    best_time: "Morning, especially in cold weather",
    icon: "sun",
  },
  {
    id: 8,
    name: "Three-Part Breath",
    name_sanskrit: "Dirga Pranayama",
    category: "Balancing",
    duration: "5–15 min",
    difficulty: "Beginner",
    dosha_effect: "Calms Vata; gently balances all doshas",
    description:
      "A gentle, complete breathing technique that fills the belly, ribs, and chest in three stages. The foundation for all other pranayama and an excellent starting point.",
    benefits: [
      "Teaches full diaphragmatic breathing",
      "Reduces shallow breathing patterns",
      "Calms the nervous system",
      "Increases lung capacity",
      "Grounds Vata energy",
    ],
    technique: [
      "Lie down or sit comfortably",
      "Place one hand on belly, one on chest",
      "Inhale: fill the belly first, then the ribs, then the upper chest",
      "Exhale: release chest, then ribs, then belly — like a wave",
      "Keep the breath slow and smooth",
      "Practice for 5–15 minutes",
      "Excellent as a daily foundation practice",
    ],
    best_time: "Any time; ideal for beginners as a daily practice",
    icon: "wind",
  },
];

// Sample video references for pranayama exercises
const PRANAYAMA_VIDEOS: Record<number, VideoReference[]> = {
  1: [
    {
      id: "pv1",
      title: "Nadi Shodhana — Alternate Nostril Breathing Tutorial",
      url: "https://www.youtube.com/watch?v=8VwufJrUhic",
      platform: "youtube",
      embedUrl: "https://www.youtube.com/embed/8VwufJrUhic",
      thumbnailUrl: "https://img.youtube.com/vi/8VwufJrUhic/hqdefault.jpg",
      durationDisplay: "10:15",
      language: "English",
      sourceName: "Yoga With Adriene",
      isPrimary: true,
    },
  ],
  2: [
    {
      id: "pv2",
      title: "Kapalabhati Pranayama — Skull Shining Breath Guide",
      url: "https://www.youtube.com/watch?v=aaGLCRCpras",
      platform: "youtube",
      embedUrl: "https://www.youtube.com/embed/aaGLCRCpras",
      thumbnailUrl: "https://img.youtube.com/vi/aaGLCRCpras/hqdefault.jpg",
      durationDisplay: "7:42",
      language: "English",
      sourceName: "Breath Is Life",
      isPrimary: true,
    },
  ],
  3: [
    {
      id: "pv3",
      title: "Ujjayi Breathing — Ocean Breath for Yoga",
      url: "https://www.youtube.com/watch?v=IFbnmtOJmgc",
      platform: "youtube",
      embedUrl: "https://www.youtube.com/embed/IFbnmtOJmgc",
      thumbnailUrl: "https://img.youtube.com/vi/IFbnmtOJmgc/hqdefault.jpg",
      durationDisplay: "5:30",
      language: "English",
      sourceName: "Yoga With Adriene",
      isPrimary: true,
    },
  ],
  6: [
    {
      id: "pv4",
      title: "Bhramari Pranayama — Humming Bee Breath",
      url: "https://www.youtube.com/watch?v=ixnHMFBMW0E",
      platform: "youtube",
      embedUrl: "https://www.youtube.com/embed/ixnHMFBMW0E",
      thumbnailUrl: "https://img.youtube.com/vi/ixnHMFBMW0E/hqdefault.jpg",
      durationDisplay: "6:18",
      language: "English",
      sourceName: "Yoga International",
      isPrimary: true,
    },
  ],
};

const CATEGORIES = ["All", "Balancing", "Calming", "Energizing", "Cooling"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-800",
  Intermediate: "bg-amber-100 text-amber-800",
  Advanced: "bg-red-100 text-red-800",
};

export default function PranayamaPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoReference | null>(null);

  const filtered = PRANAYAMA_DATA.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.name_sanskrit.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    const matchesDifficulty = difficulty === "All" || p.difficulty === difficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pranayama Library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {filtered.length} breathing exercises &mdash; assign to patients or use as reference
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search pranayama..."
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
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-44">
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All levels" : d}
            </option>
          ))}
        </Select>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const IconComp = ICON_MAP[p.icon];
          const isOpen = expanded === p.id;
          return (
            <div
              key={p.id}
              className="rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setExpanded(isOpen ? null : p.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground italic">{p.name_sanskrit}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {p.category}
                </Badge>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[p.difficulty]}`}>
                  {p.difficulty}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {p.duration}
                </span>
              </div>

              {/* Dosha effect */}
              <p className="text-xs text-muted-foreground">{p.dosha_effect}</p>

              {/* Video indicator */}
              {PRANAYAMA_VIDEOS[p.id] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVideo(PRANAYAMA_VIDEOS[p.id][0]);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="size-3.5 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="border-l-[5px] border-l-primary border-y-[3px] border-y-transparent ml-0.5 size-0" />
                  </span>
                  {PRANAYAMA_VIDEOS[p.id].length} video{PRANAYAMA_VIDEOS[p.id].length > 1 ? "s" : ""}
                </button>
              )}

              {/* Expanded content */}
              {isOpen && (
                <div className="pt-3 border-t space-y-3 text-sm">
                  <p className="text-muted-foreground text-xs">{p.description}</p>

                  <div>
                    <p className="font-medium text-xs mb-1">Benefits</p>
                    <ul className="space-y-0.5">
                      {p.benefits.map((b) => (
                        <li key={b} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-primary mt-0.5 shrink-0">+</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-xs mb-1">Technique</p>
                    <ol className="space-y-1">
                      {p.technique.map((step, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {p.best_time && (
                    <div>
                      <p className="font-medium text-xs mb-0.5">Best Time</p>
                      <p className="text-xs text-muted-foreground">{p.best_time}</p>
                    </div>
                  )}

                  {p.contraindications && (
                    <div>
                      <p className="font-medium text-xs text-amber-600 mb-0.5">Contraindications</p>
                      <p className="text-xs text-amber-700">{p.contraindications}</p>
                    </div>
                  )}

                  {/* Videos section in expanded view */}
                  {PRANAYAMA_VIDEOS[p.id] && PRANAYAMA_VIDEOS[p.id].length > 0 && (
                    <div>
                      <p className="font-medium text-xs mb-2">Videos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRANAYAMA_VIDEOS[p.id].map((v) => (
                          <VideoThumbnail
                            key={v.id}
                            video={v}
                            onClick={() => setActiveVideo(v)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No pranayama exercises match your search.
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </div>
  );
}
