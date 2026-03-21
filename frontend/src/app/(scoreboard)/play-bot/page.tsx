import { PlayBotPage } from "@/components/playbot/PlayBotPage";

export const metadata = {
    title: 'Play vs Maia | ChessDojo',
    description:
        'Play chess against Maia — a human-like AI that predicts the moves real players make at each rating level.',
};

export default function Page() {
    return <PlayBotPage />;
}