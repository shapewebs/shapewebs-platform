import styles from "./surface.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Surface = createStyledComponent("div", styles.root, "styled");
