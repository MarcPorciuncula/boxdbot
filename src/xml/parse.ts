import { from } from "ix/asynciterable/index"
import { flatMap } from "ix/asynciterable/operators/index"
import { XmlNode, create as createXmlReader } from "xml-reader"
import debounce from "lodash.debounce"
import { TextDecoder } from "node:util"

export function parse(input: AsyncIterable<Uint8Array | Buffer>) {
  const reader = createXmlReader({
    stream: true,
    parentNodes: false,
    emitTopLevelOnly: false,
  })

  const decoder = new TextDecoder("utf-8")

  return from(input).pipe(
    flatMap((chunk: Buffer | Uint8Array) => {
      return new Promise<XmlNode[]>((resolve) => {
        let cancelled = false
        const tags: XmlNode[] = []
        const complete = debounce(() => {
          cancelled = true
          resolve(tags)
        }, 1)
        reader.on("tag", (name: string, tag: XmlNode): void => {
          if (cancelled) return
          tags.push(tag)
          complete()
        })
        reader.parse(decoder.decode(chunk))
      })
    }),
  )
}
