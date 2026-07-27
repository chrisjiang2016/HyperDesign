from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")
text = path.read_text(encoding="utf-8")

old = """                  onLoad={() => {
                    try {
                      const iframe = iframeRef.current
                      const doc = iframe?.contentDocument
                      if (doc && !doc.getElementById('__prototype-inspector')) {
                        const script = doc.createElement('script')
                        script.id = '__prototype-inspector'
                        script.src = '/prototype-assets/inspector.js'
                        doc.head.appendChild(script)
                      }
                      if (inspectMode) {
                        setTimeout(() => {
                          sendInspectorState(true)
                          sendViewerMode('inspect')
                        }, 500)
                      } else if (commentMode) {
                        setTimeout(() => sendViewerMode('comment'), 500)
                      } else {
                        setTimeout(() => sendViewerMode('normal'), 500)
                      }
                    } catch {
                      // ignore
                    }
                  }}
"""

new = """                  onLoad={() => {
                    try {
                      const iframe = iframeRef.current
                      const doc = iframe?.contentDocument
                      if (doc && !doc.getElementById('__prototype-inspector')) {
                        const script = doc.createElement('script')
                        script.id = '__prototype-inspector'
                        script.src = '/prototype-assets/inspector.js?v=6'
                        // 脚本就绪后再同步模式，避免 postMessage 早于 inspector 初始化
                        script.onload = () => {
                          if (inspectMode) {
                            sendInspectorState(true)
                            sendViewerMode('inspect')
                          } else if (commentMode) {
                            sendViewerMode('comment')
                          } else {
                            sendViewerMode('normal')
                          }
                        }
                        doc.head.appendChild(script)
                      } else if (inspectMode) {
                        sendInspectorState(true)
                        sendViewerMode('inspect')
                      } else if (commentMode) {
                        sendViewerMode('comment')
                      } else {
                        sendViewerMode('normal')
                      }
                      // 兜底：无论 script onload 是否触发，延迟再同步一次
                      setTimeout(() => {
                        if (inspectMode) {
                          sendInspectorState(true)
                          sendViewerMode('inspect')
                        } else if (commentMode) {
                          sendViewerMode('comment')
                        } else {
                          sendViewerMode('normal')
                        }
                      }, 300)
                    } catch {
                      // ignore
                    }
                  }}
"""

if old not in text:
    raise SystemExit("onLoad block not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("iframe onLoad hardened")
