import styles from "./toast.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Toast = createStyledComponent("div", styles.root);
