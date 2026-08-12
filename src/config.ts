import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "Falta DISCORD_TOKEN"),
  DEVELOPER_IDS: z.string().default("").transform((value, context) => {
    const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
    const invalid = ids.find((id) => !/^\d+$/.test(id));
    if (invalid) {
      context.addIssue({
        code: "custom",
        message: `DEVELOPER_IDS contiene un ID no válido: ${invalid}`,
      });
      return z.NEVER;
    }
    return ids;
  }),
  MONGODB_URI: z.string().min(1, "Falta MONGODB_URI"),
  MONGODB_DATABASE: z.string().min(1).default("bothalla"),
  BRAWLHALLA_API_URL: z.url().default("https://api.brawlhalla.com/v1"),
  PORT: z.coerce.number().int().positive().max(65_535).default(10_000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(): AppConfig {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuración inválida:\n${details}`);
  }

  return {
    ...result.data,
    BRAWLHALLA_API_URL: result.data.BRAWLHALLA_API_URL.replace(/\/+$/, ""),
  };
}
