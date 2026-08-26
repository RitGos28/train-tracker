import type { Station } from "@/lib/types";
import styles from "./StationSelector.module.css";

export default function StationSelector({
  stations,
  value,
  onChange,
}: {
  stations: Station[];
  value: string;
  onChange: (stationId: string) => void;
}) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor="station-select" className={styles.label}>
        Station
      </label>
      <select
        id="station-select"
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.name}
          </option>
        ))}
      </select>
    </div>
  );
}
