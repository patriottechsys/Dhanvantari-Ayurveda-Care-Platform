"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";

type DoshaScores = { vata: number; pitta: number; kapha: number };

type Props = {
  prakriti?: DoshaScores | null;
  vikriti?: DoshaScores | null;
};

export default function DoshaRadarChart({ prakriti, vikriti }: Props) {
  if (!prakriti && !vikriti) return null;

  const data = [
    { dosha: "Vata", prakriti: prakriti?.vata ?? 0, vikriti: vikriti?.vata ?? 0 },
    { dosha: "Pitta", prakriti: prakriti?.pitta ?? 0, vikriti: vikriti?.pitta ?? 0 },
    { dosha: "Kapha", prakriti: prakriti?.kapha ?? 0, vikriti: vikriti?.kapha ?? 0 },
  ];

  const maxVal = Math.max(
    ...[prakriti?.vata, prakriti?.pitta, prakriti?.kapha, vikriti?.vata, vikriti?.pitta, vikriti?.kapha]
      .filter((v): v is number => v != null),
    5
  );

  return (
    <div className="flex justify-center">
      <ResponsiveContainer width={280} height={240}>
        <RadarChart data={data} cx="50%" cy="45%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dosha"
            tick={{ fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxVal + 1]}
            tick={false}
            axisLine={false}
          />
          {prakriti && (
            <Radar
              name="Prakriti"
              dataKey="prakriti"
              stroke="#D4942C"
              fill="#D4942C"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          )}
          {vikriti && (vikriti.vata > 0 || vikriti.pitta > 0 || vikriti.kapha > 0) && (
            <Radar
              name="Vikriti"
              dataKey="vikriti"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
