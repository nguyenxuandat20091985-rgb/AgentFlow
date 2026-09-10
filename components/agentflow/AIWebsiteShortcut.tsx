import styles from "./AIWebsiteShortcut.module.css";

const WEBSITE_URL = "https://agentflow-khaki-rho.vercel.app/website";

export default function AIWebsiteShortcut() {
  return (
    <a className={styles.card} href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" aria-label="Mở AI Website – Nhà Bếp Thông Minh">
      <span className={styles.icon}>W</span>
      <span className={styles.copy}>
        <strong>AI Website – Nhà Bếp Thông Minh</strong>
        <small>Kiểm tra website đang vận hành · mở bằng 1 chạm</small>
      </span>
      <span className={styles.arrow}>↗</span>
    </a>
  );
}
