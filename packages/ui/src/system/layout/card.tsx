import styles from "./card.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Card = createStyledComponent("article", styles.root);
