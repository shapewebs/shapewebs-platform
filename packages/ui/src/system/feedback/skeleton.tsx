import styles from "./skeleton.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Skeleton = createStyledComponent("div", styles.root);
