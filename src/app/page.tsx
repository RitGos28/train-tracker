import TrainTrackerApp from "@/components/TrainTrackerApp";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Meridian Line Predictor</h1>
        <p>AI-assisted arrival predictions, live weather, and track conditions.</p>
      </header>
      <main className={styles.main}>
        <TrainTrackerApp />
      </main>
    </div>
  );
}
