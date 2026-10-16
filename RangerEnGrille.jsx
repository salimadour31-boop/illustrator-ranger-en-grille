/*
 * RangerEnGrille.jsx — v1.0.0
 * Adobe Illustrator (ExtendScript / ES3), CC 2018 et plus récent.
 *
 * FR : Range les objets sélectionnés dans une grille régulière (colonnes x rangées),
 *      avec gouttières, alignement dans la cellule, ordre de tri et sens de remplissage.
 * EN : Arranges the selected objects into a tidy grid (columns x rows) with gutters,
 *      in-cell alignment, sort order and fill direction.
 *
 * Statut / Status : non testé dans Illustrator (syntaxe ES3 vérifiée avec acorn).
 *                   Not tested in Illustrator (ES3 syntax checked with acorn).
 * Conseil / Tip   : travaillez sur une copie de votre fichier. / Work on a copy of your file.
 * Aucun appel réseau, aucune collecte de données. / No network calls, no data collection.
 *
 * Licence MIT — (c) 2026 Amirouche Amwanes
 */

#target illustrator

(function () {

    // ---------------------------------------------------------------
    // Langue / Language
    // ---------------------------------------------------------------
    var FR = false;
    try { FR = String(app.locale).indexOf("fr") === 0; } catch (eLoc) { FR = false; }
    function T(fr, en) { return FR ? fr : en; }

    var TITLE = T("Ranger en grille", "Arrange in grid") + " v1.0.0";

    // ---------------------------------------------------------------
    // Vérifications de départ / Initial checks
    // ---------------------------------------------------------------
    if (app.documents.length === 0) {
        alert(T("Aucun document ouvert.\nOuvrez un document puis relancez le script.",
                "No document is open.\nOpen a document and run the script again."), TITLE);
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;

    // Une sélection de texte (curseur dans un bloc) n'est pas un tableau d'objets.
    // A text selection (cursor inside a frame) is not an array of objects.
    if (!sel || typeof sel.length !== "number" || sel.length === 0 || sel.typename === "TextRange") {
        alert(T("Rien n'est sélectionné.\nSélectionnez au moins deux objets (outil Sélection, pas le texte).",
                "Nothing is selected.\nSelect at least two objects (Selection tool, not text)."), TITLE);
        return;
    }

    // Garder uniquement les objets de premier niveau de la sélection (pas les enfants
    // d'un groupe déjà sélectionné) et non verrouillés.
    // Keep only top-level selected items (not children of a selected group) that are unlocked.
    var items = [];
    var i;
    for (i = 0; i < sel.length; i++) {
        var it = sel[i];
        if (!it || it.locked) { continue; }
        if (hasSelectedAncestor(it)) { continue; }
        items.push(it);
    }
    if (items.length < 2) {
        alert(T("Il faut au moins deux objets sélectionnés (non verrouillés).",
                "At least two selected (unlocked) objects are required."), TITLE);
        return;
    }

    function hasSelectedAncestor(it) {
        var p;
        try { p = it.parent; } catch (e) { return false; }
        while (p && p.typename !== "Layer" && p.typename !== "Document") {
            try { if (p.selected) { return true; } } catch (e2) {}
            try { p = p.parent; } catch (e3) { return false; }
        }
        return false;
    }

    // ---------------------------------------------------------------
    // Unités / Units
    // ---------------------------------------------------------------
    var UNITS = [
        { key: "mm", label: "mm", pt: 72 / 25.4 },
        { key: "cm", label: "cm", pt: 72 / 2.54 },
        { key: "pt", label: "pt", pt: 1 },
        { key: "px", label: "px", pt: 1 },
        { key: "in", label: "in", pt: 72 }
    ];

    function parseNum(str, fallback) {
        var s = String(str).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        var n = parseFloat(s);
        return isNaN(n) ? fallback : n;
    }

    // ---------------------------------------------------------------
    // Limites d'un objet / Item bounds  [left, top, right, bottom], y vers le haut
    // Pour un groupe masqué : limites du tracé de masque (pas du contenu caché).
    // For a clipped group: bounds of the clipping path (not hidden content).
    // ---------------------------------------------------------------
    function getBounds(it, useVisible) {
        if (it.typename === "GroupItem" && it.clipped) {
            var clip = findClipPath(it);
            if (clip) { return useVisible ? clip.visibleBounds : clip.geometricBounds; }
        }
        return useVisible ? it.visibleBounds : it.geometricBounds;
    }

    function findClipPath(g) {
        var k, pi;
        for (k = 0; k < g.pageItems.length; k++) {
            pi = g.pageItems[k];
            if (pi.typename === "PathItem" && pi.clipping) { return pi; }
            if (pi.typename === "CompoundPathItem") {
                try { if (pi.pathItems.length > 0 && pi.pathItems[0].clipping) { return pi; } } catch (e) {}
            }
        }
        return null;
    }

    // ---------------------------------------------------------------
    // Tri / Sorting
    // ---------------------------------------------------------------
    function buildRecords(list, useVisible) {
        var recs = [], k, b;
        for (k = 0; k < list.length; k++) {
            b = getBounds(list[k], useVisible);
            recs.push({
                item: list[k],
                idx: k,
                left: b[0], top: b[1],
                w: Math.abs(b[2] - b[0]),
                h: Math.abs(b[1] - b[3]),
                name: String(list[k].name || "")
            });
        }
        return recs;
    }

    // Ordre de lecture : on regroupe les objets en lignes visuelles, puis gauche -> droite.
    // Reading order: cluster items into visual lines, then left -> right.
    function sortReading(recs) {
        var hs = [], k;
        for (k = 0; k < recs.length; k++) { hs.push(recs[k].h); }
        hs.sort(function (a, b) { return a - b; });
        var tol = Math.max(1, hs[Math.floor(hs.length / 2)] / 2);
        var byTop = recs.slice(0);
        byTop.sort(function (a, b) { return b.top - a.top; });
        var lines = [], cur = [], lineTop = null;
        for (k = 0; k < byTop.length; k++) {
            if (lineTop === null || Math.abs(byTop[k].top - lineTop) <= tol) {
                if (lineTop === null) { lineTop = byTop[k].top; }
                cur.push(byTop[k]);
            } else {
                lines.push(cur);
                cur = [byTop[k]];
                lineTop = byTop[k].top;
            }
        }
        if (cur.length) { lines.push(cur); }
        var out = [], j;
        for (k = 0; k < lines.length; k++) {
            lines[k].sort(function (a, b) { return a.left - b.left; });
            for (j = 0; j < lines[k].length; j++) { out.push(lines[k][j]); }
        }
        return out;
    }

    // Ordre naturel des noms : "objet 2" avant "objet 10".
    // Natural name order: "item 2" before "item 10".
    function naturalCompare(a, b) {
        var re = /(\d+|\D+)/g;
        var ax = String(a).toLowerCase().match(re) || [];
        var bx = String(b).toLowerCase().match(re) || [];
        var n = Math.min(ax.length, bx.length), k, an, bn;
        for (k = 0; k < n; k++) {
            an = /^\d/.test(ax[k]); bn = /^\d/.test(bx[k]);
            if (an && bn) {
                var d = parseInt(ax[k], 10) - parseInt(bx[k], 10);
                if (d !== 0) { return d; }
            } else if (ax[k] !== bx[k]) {
                return ax[k] < bx[k] ? -1 : 1;
            }
        }
        return ax.length - bx.length;
    }

    function sortRecords(recs, mode) {
        var out = recs.slice(0), k, j, tmp;
        // Tri stable : départage par l'index d'origine / Stable sort: tie-break on original index
        if (mode === 0) { return sortReading(out); }
        if (mode === 1) { out.sort(function (a, b) { return a.idx - b.idx; }); return out; }
        if (mode === 2) {
            out.sort(function (a, b) { var c = naturalCompare(a.name, b.name); return c !== 0 ? c : a.idx - b.idx; });
            return out;
        }
        if (mode === 3) { out.sort(function (a, b) { return (b.w - a.w) || (a.idx - b.idx); }); return out; }
        if (mode === 4) { out.sort(function (a, b) { return (b.h - a.h) || (a.idx - b.idx); }); return out; }
        if (mode === 5) { out.sort(function (a, b) { return (b.w * b.h - a.w * a.h) || (a.idx - b.idx); }); return out; }
        if (mode === 6) {
            for (k = out.length - 1; k > 0; k--) {
                j = Math.floor(Math.random() * (k + 1));
                tmp = out[k]; out[k] = out[j]; out[j] = tmp;
            }
            return out;
        }
        return out;
    }

    // ---------------------------------------------------------------
    // Calcul de la grille (sans modifier le document)
    // Grid computation (does not modify the document)
    // ---------------------------------------------------------------
    function computeLayout(opt) {
        var recs = sortRecords(buildRecords(items, opt.visible), opt.order);
        var n = recs.length;
        var cols, rows;
        if (opt.countMode === 0) {          // colonnes fixées / fixed columns
            cols = Math.max(1, Math.min(n, opt.count));
            rows = Math.ceil(n / cols);
        } else if (opt.countMode === 1) {   // rangées fixées / fixed rows
            rows = Math.max(1, Math.min(n, opt.count));
            cols = Math.ceil(n / rows);
        } else {                            // auto, grille la plus carrée / auto, squarest grid
            cols = Math.ceil(Math.sqrt(n));
            rows = Math.ceil(n / cols);
        }

        // Position (colonne, rangée) de chaque objet / (col, row) of each item
        var k, c, r;
        for (k = 0; k < n; k++) {
            if (opt.byColumns) { c = Math.floor(k / rows); r = k % rows; }
            else { r = Math.floor(k / cols); c = k % cols; }
            recs[k].col = c; recs[k].row = r;
        }

        // Taille des cellules / Cell sizes
        var colW = [], rowH = [], maxW = 0, maxH = 0;
        for (k = 0; k < cols; k++) { colW.push(0); }
        for (k = 0; k < rows; k++) { rowH.push(0); }
        for (k = 0; k < n; k++) {
            if (recs[k].w > colW[recs[k].col]) { colW[recs[k].col] = recs[k].w; }
            if (recs[k].h > rowH[recs[k].row]) { rowH[recs[k].row] = recs[k].h; }
            if (recs[k].w > maxW) { maxW = recs[k].w; }
            if (recs[k].h > maxH) { maxH = recs[k].h; }
        }
        if (opt.cellMode === 0) {           // cellules uniformes / uniform cells
            for (k = 0; k < cols; k++) { colW[k] = maxW; }
            for (k = 0; k < rows; k++) { rowH[k] = maxH; }
        } else if (opt.cellMode === 2) {    // taille fixe saisie / fixed typed size
            for (k = 0; k < cols; k++) { colW[k] = opt.cellW; }
            for (k = 0; k < rows; k++) { rowH[k] = opt.cellH; }
        }                                   // 1 = adaptées par colonne/rangée / fitted per column/row

        // Décalages cumulés / Cumulative offsets
        var colX = [0], rowY = [0];
        for (k = 1; k < cols; k++) { colX.push(colX[k - 1] + colW[k - 1] + opt.gapH); }
        for (k = 1; k < rows; k++) { rowY.push(rowY[k - 1] + rowH[k - 1] + opt.gapV); }
        var totalW = colX[cols - 1] + colW[cols - 1];
        var totalH = rowY[rows - 1] + rowH[rows - 1];

        // Origine (coin haut-gauche) / Origin (top-left corner)
        var x0, y0;
        if (opt.origin === 1) {
            var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
            x0 = ab[0] + opt.margin;
            y0 = ab[1] - opt.margin;
        } else {
            // coin haut-gauche de l'ensemble de la sélection / top-left of the whole selection
            x0 = recs[0].left; y0 = recs[0].top;
            for (k = 1; k < n; k++) {
                if (recs[k].left < x0) { x0 = recs[k].left; }
                if (recs[k].top > y0) { y0 = recs[k].top; }
            }
        }

        // Cible de chaque objet / Target of each item
        for (k = 0; k < n; k++) {
            var cw = colW[recs[k].col], ch = rowH[recs[k].row];
            var tx = x0 + colX[recs[k].col];
            var ty = y0 - rowY[recs[k].row];
            if (opt.alignH === 1) { tx += (cw - recs[k].w) / 2; }
            else if (opt.alignH === 2) { tx += cw - recs[k].w; }
            if (opt.alignV === 1) { ty -= (ch - recs[k].h) / 2; }
            else if (opt.alignV === 2) { ty -= ch - recs[k].h; }
            recs[k].dx = tx - recs[k].left;
            recs[k].dy = ty - recs[k].top;
        }

        return { recs: recs, cols: cols, rows: rows, totalW: totalW, totalH: totalH,
                 overflow: opt.cellMode === 2 && (maxW > opt.cellW || maxH > opt.cellH) };
    }

    // ---------------------------------------------------------------
    // Application / Apply
    // ---------------------------------------------------------------
    function applyLayout(layout, opt) {
        var k, moved = 0;
        for (k = 0; k < layout.recs.length; k++) {
            var rc = layout.recs[k];
            if (Math.abs(rc.dx) > 0.001 || Math.abs(rc.dy) > 0.001) {
                // translate(dx, dy, objets, remplissages, motifs, dégradés, contours, ...)
                // Déplace l'objet et ses motifs/dégradés avec lui.
                // Moves the object along with its patterns/gradients.
                rc.item.translate(rc.dx, rc.dy, true, true, true, true);
                moved++;
            }
        }
        if (opt.group) {
            var parent = layout.recs[0].item.parent;
            var g;
            if (parent && (parent.typename === "Layer" || parent.typename === "GroupItem")) {
                g = parent.groupItems.add();
            } else {
                g = doc.activeLayer.groupItems.add();
            }
            g.move(layout.recs[0].item, ElementPlacement.PLACEBEFORE);
            // On déplace dans l'ordre du tri pour que l'empilement suive la grille.
            // Move in sort order so stacking follows the grid.
            for (k = 0; k < layout.recs.length; k++) {
                layout.recs[k].item.move(g, ElementPlacement.PLACEATEND);
            }
            g.name = T("Grille", "Grid") + " " + layout.cols + "x" + layout.rows;
            doc.selection = null;
            g.selected = true;
        }
        return moved;
    }

    // ---------------------------------------------------------------
    // Interface / Dialog (ScriptUI)
    // ---------------------------------------------------------------
    var w = new Window("dialog", TITLE);
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    w.add("statictext", undefined,
        T("Objets sélectionnés : ", "Selected objects: ") + items.length);

    // Disposition / Layout
    var pLay = w.add("panel", undefined, T("Disposition", "Layout"));
    pLay.orientation = "column"; pLay.alignChildren = ["left", "top"]; pLay.margins = 12;
    var gCount = pLay.add("group");
    var ddCount = gCount.add("dropdownlist", undefined, [
        T("Nombre de colonnes", "Number of columns"),
        T("Nombre de rangées", "Number of rows"),
        T("Automatique (grille carrée)", "Automatic (square grid)")
    ]);
    ddCount.selection = 0;
    var etCount = gCount.add("edittext", undefined, String(Math.ceil(Math.sqrt(items.length))));
    etCount.characters = 5;
    var gDir = pLay.add("group");
    gDir.add("statictext", undefined, T("Remplir :", "Fill:"));
    var rbRows = gDir.add("radiobutton", undefined, T("rangée par rangée", "row by row"));
    var rbCols = gDir.add("radiobutton", undefined, T("colonne par colonne", "column by column"));
    rbRows.value = true;

    var gOrder = pLay.add("group");
    gOrder.add("statictext", undefined, T("Ordre :", "Order:"));
    var ddOrder = gOrder.add("dropdownlist", undefined, [
        T("Position actuelle (lecture)", "Current position (reading)"),
        T("Ordre de sélection / empilement", "Selection / stacking order"),
        T("Nom (A → Z, naturel)", "Name (A → Z, natural)"),
        T("Largeur (décroissante)", "Width (largest first)"),
        T("Hauteur (décroissante)", "Height (largest first)"),
        T("Surface (décroissante)", "Area (largest first)"),
        T("Aléatoire", "Random")
    ]);
    ddOrder.selection = 0;

    // Espacement / Spacing
    var pGap = w.add("panel", undefined, T("Espacement et cellules", "Spacing and cells"));
    pGap.orientation = "column"; pGap.alignChildren = ["left", "top"]; pGap.margins = 12;
    var gUnit = pGap.add("group");
    gUnit.add("statictext", undefined, T("Unité :", "Unit:"));
    var unitLabels = [];
    for (i = 0; i < UNITS.length; i++) { unitLabels.push(UNITS[i].label); }
    var ddUnit = gUnit.add("dropdownlist", undefined, unitLabels);
    ddUnit.selection = 0;
    var gGap = pGap.add("group");
    gGap.add("statictext", undefined, T("Gouttière horiz. :", "Horiz. gutter:"));
    var etGapH = gGap.add("edittext", undefined, "5"); etGapH.characters = 6;
    gGap.add("statictext", undefined, T("vert. :", "vert.:"));
    var etGapV = gGap.add("edittext", undefined, "5"); etGapV.characters = 6;

    var gCell = pGap.add("group");
    gCell.add("statictext", undefined, T("Cellules :", "Cells:"));
    var ddCell = gCell.add("dropdownlist", undefined, [
        T("Uniformes (plus grand objet)", "Uniform (largest object)"),
        T("Ajustées par colonne / rangée", "Fitted per column / row"),
        T("Taille fixe", "Fixed size")
    ]);
    ddCell.selection = 0;
    var gCellSize = pGap.add("group");
    gCellSize.add("statictext", undefined, T("Largeur :", "Width:"));
    var etCellW = gCellSize.add("edittext", undefined, "50"); etCellW.characters = 6;
    gCellSize.add("statictext", undefined, T("Hauteur :", "Height:"));
    var etCellH = gCellSize.add("edittext", undefined, "50"); etCellH.characters = 6;
    gCellSize.enabled = false;

    var cbVisible = pGap.add("checkbox", undefined,
        T("Inclure l'épaisseur des contours (limites visibles)", "Include stroke width (visible bounds)"));
    cbVisible.value = true;

    // Alignement / Alignment
    var pAl = w.add("panel", undefined, T("Alignement dans la cellule", "Alignment in cell"));
    pAl.orientation = "row"; pAl.alignChildren = ["left", "center"]; pAl.margins = 12;
    pAl.add("statictext", undefined, T("Horiz. :", "Horiz.:"));
    var ddAlH = pAl.add("dropdownlist", undefined, [T("Gauche", "Left"), T("Centre", "Center"), T("Droite", "Right")]);
    ddAlH.selection = 1;
    pAl.add("statictext", undefined, T("Vert. :", "Vert.:"));
    var ddAlV = pAl.add("dropdownlist", undefined, [T("Haut", "Top"), T("Milieu", "Middle"), T("Bas", "Bottom")]);
    ddAlV.selection = 1;

    // Origine et options / Origin and options
    var pOr = w.add("panel", undefined, T("Point de départ et options", "Start point and options"));
    pOr.orientation = "column"; pOr.alignChildren = ["left", "top"]; pOr.margins = 12;
    var rbOrSel = pOr.add("radiobutton", undefined,
        T("Coin haut-gauche de la sélection", "Top-left corner of the selection"));
    var gOrAb = pOr.add("group");
    var rbOrAb = gOrAb.add("radiobutton", undefined,
        T("Coin haut-gauche du plan de travail actif, marge :", "Top-left of the active artboard, margin:"));
    var etMargin = gOrAb.add("edittext", undefined, "10"); etMargin.characters = 6;
    rbOrSel.value = true;
    var cbGroup = pOr.add("checkbox", undefined,
        T("Grouper le résultat (dans l'ordre de la grille)", "Group the result (in grid order)"));

    var stInfo = w.add("statictext", undefined, " ", { multiline: true });
    stInfo.preferredSize = [380, 36];

    var gBtn = w.add("group");
    gBtn.alignment = ["right", "top"];
    var bAnalyze = gBtn.add("button", undefined, T("Analyser", "Analyze"));
    var bCancel = gBtn.add("button", undefined, T("Annuler", "Cancel"), { name: "cancel" });
    var bOk = gBtn.add("button", undefined, T("Ranger", "Arrange"), { name: "ok" });

    w.add("statictext", undefined,
        T("Conseil : travaillez sur une copie. Ctrl/Cmd+Z pour annuler.",
          "Tip: work on a copy. Ctrl/Cmd+Z to undo."));

    ddCount.onChange = function () { etCount.enabled = ddCount.selection.index !== 2; };
    ddCell.onChange = function () { gCellSize.enabled = ddCell.selection.index === 2; };

    function readOptions() {
        var f = UNITS[ddUnit.selection.index].pt;
        var o = {
            countMode: ddCount.selection.index,
            count: Math.round(parseNum(etCount.text, 0)),
            byColumns: rbCols.value,
            order: ddOrder.selection.index,
            gapH: parseNum(etGapH.text, NaN) * f,
            gapV: parseNum(etGapV.text, NaN) * f,
            cellMode: ddCell.selection.index,
            cellW: parseNum(etCellW.text, NaN) * f,
            cellH: parseNum(etCellH.text, NaN) * f,
            visible: cbVisible.value,
            alignH: ddAlH.selection.index,
            alignV: ddAlV.selection.index,
            origin: rbOrAb.value ? 1 : 0,
            margin: parseNum(etMargin.text, NaN) * f,
            group: cbGroup.value,
            unit: UNITS[ddUnit.selection.index]
        };
        if (o.countMode !== 2 && (!(o.count >= 1))) {
            return T("Le nombre de colonnes/rangées doit être un entier ≥ 1.", "Columns/rows must be an integer ≥ 1.");
        }
        if (isNaN(o.gapH) || isNaN(o.gapV)) {
            return T("Gouttières invalides.", "Invalid gutters.");
        }
        if (o.cellMode === 2 && (isNaN(o.cellW) || isNaN(o.cellH) || o.cellW <= 0 || o.cellH <= 0)) {
            return T("Taille de cellule invalide (> 0).", "Invalid cell size (> 0).");
        }
        if (o.origin === 1 && isNaN(o.margin)) {
            return T("Marge invalide.", "Invalid margin.");
        }
        return o;
    }

    function fmt(vPt, unit) {
        var v = vPt / unit.pt;
        return (Math.round(v * 100) / 100) + " " + unit.label;
    }

    bAnalyze.onClick = function () {
        var o = readOptions();
        if (typeof o === "string") { stInfo.text = o; return; }
        var L = computeLayout(o);
        var moving = 0, k;
        for (k = 0; k < L.recs.length; k++) {
            if (Math.abs(L.recs[k].dx) > 0.001 || Math.abs(L.recs[k].dy) > 0.001) { moving++; }
        }
        stInfo.text = T("Grille ", "Grid ") + L.cols + " × " + L.rows +
            T(" — taille totale ", " — total size ") + fmt(L.totalW, o.unit) + " × " + fmt(L.totalH, o.unit) +
            "\n" + moving + T(" objet(s) seront déplacés.", " object(s) will move.") +
            (L.overflow ? T(" Attention : des objets dépassent la cellule.", " Warning: some objects exceed the cell.") : "");
    };

    var options = null;
    bOk.onClick = function () {
        var o = readOptions();
        if (typeof o === "string") { alert(o, TITLE); return; }
        options = o;
        w.close(1);
    };

    if (w.show() !== 1 || !options) { return; }

    // ---------------------------------------------------------------
    // Exécution / Run
    // ---------------------------------------------------------------
    try {
        var layout = computeLayout(options);
        var moved = applyLayout(layout, options);
        app.redraw();
        alert(T("Terminé : ", "Done: ") + moved + T(" objet(s) déplacé(s), grille ", " object(s) moved, grid ") +
              layout.cols + " × " + layout.rows + "." +
              (layout.overflow ? "\n" + T("Attention : certains objets dépassent la taille de cellule fixée.",
                                          "Warning: some objects are larger than the fixed cell size.") : ""), TITLE);
    } catch (err) {
        alert(T("Erreur : ", "Error: ") + err.message + (err.line ? " (l. " + err.line + ")" : ""), TITLE);
    }

}());
