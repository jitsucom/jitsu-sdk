import path from "path/posix"
import * as fs from "fs"
import getLog from "../lib/log"

export type TemplateVars = Record<string, any>
export type TemplateFunction = (vars: TemplateVars) => any
export type FileTemplate = TemplateFunction | string

export type ProjectTemplate<T extends TemplateVars = TemplateVars> = Record<string, FileTemplate>

function toTemplateFunction(template: FileTemplate): TemplateFunction {
  return typeof template === "function" ? template : () => template
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
      fs.writeFileSync(filePath, content)
    }
  })
}
