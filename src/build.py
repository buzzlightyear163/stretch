# python3 src/build.py  -> rebuilds ../index.html from index.src.html, site.css, termkit.js and ../lib/core.js
import pathlib
d = pathlib.Path(__file__).resolve().parent; root = d.parent
s = (d / "index.src.html").read_text()
s = s.replace('<link rel="stylesheet" href="site.css">', "<style>\n" + (d / "site.css").read_text() + "</style>")
s = s.replace('<script src="termkit.js"></script>', "<script>\n" + (d / "termkit.js").read_text() + "</script>")
s = s.replace('<script src="lib/core.js"></script>', "<script>\n" + (root / "lib" / "core.js").read_text() + "</script>")
(root / "index.html").write_text(s); print("index.html", len(s), "bytes")
