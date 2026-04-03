import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export async function readJsonFile<T>(filePath: string, fallbackValue: T): Promise<T> {
  try {
    const rawContent = await readFile(filePath, "utf8")
    return JSON.parse(rawContent) as T
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === "ENOENT") {
      return fallbackValue
    }

    throw error
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  const directory = dirname(filePath)
  await mkdir(directory, { recursive: true })

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(tempPath, filePath)
}
