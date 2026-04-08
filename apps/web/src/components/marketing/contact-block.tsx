import Link from "next/link";
import styles from "./contact-block.module.css";

type ContactChannel = {
  label: string;
  detail: string;
  href: string;
  linkLabel: string;
};

type ContactBlockProps = {
  eyebrow?: string;
  title: string;
  body: string;
  channels: readonly ContactChannel[];
};

export function ContactBlock({
  eyebrow,
  title,
  body,
  channels,
}: ContactBlockProps) {
  return (
    <section className={styles.root}>
      <div className={styles.panel}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
      </div>

      <div className={styles.channelList}>
        {channels.map((channel) => (
          <article className={styles.channelCard} key={channel.label}>
            <p className={styles.channelLabel}>{channel.label}</p>
            <p className={styles.channelDetail}>{channel.detail}</p>
            <Link className={styles.channelLink} href={channel.href}>
              {channel.linkLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
