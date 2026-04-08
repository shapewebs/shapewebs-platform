import styles from "./search-field.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const SearchField = createStyledComponent("input", styles.root);
