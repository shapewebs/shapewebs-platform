import styles from "./popover.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Popover = createStyledComponent("div", styles.root);
