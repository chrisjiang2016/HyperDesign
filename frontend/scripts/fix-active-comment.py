from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")
text = path.read_text(encoding="utf-8")

old = """  const activeComment = useMemo(() => {
    if (!activeMarker) return null
    return commentMap.get(activeMarker.commentId) ?? null
  }, [activeMarker, commentMap])
"""

# Keep variable but mark used via void reference in comment list heading is overkill.
# Prefer removing if only inspect used it; commentMap still needed for list rendering.
if old not in text:
    raise SystemExit("activeComment block not found")

# Check if commentMap is only used by activeComment
uses_comment_map = text.count("commentMap")
print("commentMap uses:", uses_comment_map)

# Remove activeComment only
text = text.replace(old, "", 1)

# If commentMap becomes unused, remove it too
if text.count("commentMap") == 1 and "const commentMap" in text:
    old_map = """  const commentMap = useMemo(() => new Map(activeComments.map((comment) => [comment.id, comment])), [activeComments])

"""
    if old_map in text:
        text = text.replace(old_map, "", 1)
        print("removed commentMap too")
    else:
        print("commentMap pattern mismatch")
else:
    print("commentMap still used")

path.write_text(text, encoding="utf-8")
print("fixed")
