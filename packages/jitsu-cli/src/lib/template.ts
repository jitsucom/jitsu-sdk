import path from "path/posix"
import * as fs from "fs"
import getLog from "./log"
import { align, removeIndentation } from "./indent"

export type TemplateVars = Record<string, any>
export type TemplateFunction<T> = (vars: T) => any
export type FileTemplate<T> = TemplateFunction<T> | string | any

export type ProjectTemplate<T extends TemplateVars = TemplateVars> = Record<string, FileTemplate<T>>

function toTemplateFunction<T>(template: FileTemplate<T>): TemplateFunction<T> {
  if (template === null || template === undefined) {
    return () => undefined
  } else if (typeof template === "function") {
    return template;
  } else {
    return () => template;
  }
}

export function write(dir: string, template: ProjectTemplate, vars: TemplateVars) {
  Object.entries(template).forEach(([fileName, template]) => {
    let filePath = path.resolve(dir, fileName)
    let fileDir = path.dirname(filePath)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    let content = toTemplateFunction(template)(vars)
    if (typeof content === "object") {
      content = JSON.stringify(content, null, 2)
    }
    if (content) {
      let data = removeIndentation(content)
      fs.writeFileSync(filePath, data)
    }
  })
}
