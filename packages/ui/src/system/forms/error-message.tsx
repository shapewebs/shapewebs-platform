import styles from "./error-message.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const ErrorMessage = createStyledComponent("p", styles.root);
