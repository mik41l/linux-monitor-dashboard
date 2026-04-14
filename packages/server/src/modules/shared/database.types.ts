import type { ReturnTypeWithoutVoid } from "./return-type-without-void.js";
import { createDatabase } from "../../config/database.js";

export type Database = ReturnTypeWithoutVoid<typeof createDatabase>;

