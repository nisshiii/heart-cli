import dynamic from "next/dynamic";

const HeartCanvas = dynamic(() => import("../components/HeartCanvas"), {
  ssr: false
});

export default function Home() {
  return (
    <main className="page">
      <div className="stage">
        <HeartCanvas />
        <div className="caption">
          <strong>ECG HEART</strong>
          <span>3D pulse line loop</span>
        </div>
      </div>
    </main>
  );
}
