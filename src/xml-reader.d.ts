declare module "xml-reader" {
  import { EventEmitter } from "stream"

  export interface XmlNode {
    name: string
    type: string
    value: string
    parent: XmlNode | null
    attributes: Record<string, string>
    children: XmlNode[]
  }

  interface XmlReader extends EventEmitter {
    parse(chunk: string): void

    on<T extends string>(
      event: `tag:${T}`,
      listener: (node: XmlNode) => void,
    ): this
    on(event: string, listener: (name: string, node: XmlNode) => void): this
  }

  export function create(options: {
    stream?: boolean
    parentNodes?: boolean
    emitTopLevelOnly?: boolean
  }): XmlReader
}
