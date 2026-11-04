import fs from 'fs';
import path from 'path';

const HTML_SOURCE = 'C:/Users/shiro/.gemini/antigravity/brain/1e5b94a1-a7e2-4570-bc92-df9fe50e0f74/erd_diagram_interactive.html';
const OUTPUT_ROOT = path.resolve('AlumniTracker_ERD.drawio');
const OUTPUT_ARTIFACT = 'C:/Users/shiro/.gemini/antigravity/brain/4be43608-14b9-4644-8287-49425ce580c3/AlumniTracker_ERD.drawio';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateDrawio() {
  const content = fs.readFileSync(HTML_SOURCE, 'utf8');
  const lines = content.split('\n');

  // Extract DEFAULT_LAYOUT
  const layoutCode = lines.slice(305, 336).join('\n').replace('const DEFAULT_LAYOUT =', '').replace(/;\s*$/, '');
  const layout = eval('(' + layoutCode + ')');

  // Extract ENTITIES
  const entCode = lines.slice(337, 654).join('\n').replace('const ENTITIES =', '');
  const entities = eval(entCode);

  // Extract RELATIONSHIPS
  const relCode = lines.slice(660, 691).join('\n').replace('const RELATIONSHIPS =', '');
  const relationships = eval(relCode);

  console.log(`Loaded ${entities.length} entities, ${relationships.length} relationships.`);

  let cellIdCounter = 2;
  const nextId = () => `cell_${cellIdCounter++}`;

  const entityCellIdMap = {};
  const cells = [];

  // Title Banner
  const titleId = nextId();
  const titleHtml = `
    <div style="font-family:Arial,sans-serif;text-align:center;color:#000000;padding:4px;">
      <div style="font-size:20px;font-weight:bold;letter-spacing:1px;">CTU-NAGA ALUMNI TRACKER &bull; DATABASE ENTITY-RELATIONSHIP DIAGRAM (ERD)</div>
      <div style="font-size:12px;color:#333333;margin-top:4px;">Formal Monochrome ER Specification &bull; Replicating Interactive HTML ERD &bull; 20 Entities &bull; 19 Relationships</div>
      <div style="font-size:10px;color:#555555;margin-top:2px;">Solid Lines: Strong Identifying (CASCADE) &bull; Broken Lines: Weak Non-Identifying (SET NULL) &bull; Double Border: Weak Entities</div>
    </div>
  `.trim().replace(/\s+/g, ' ');

  cells.push(`
    <mxCell id="${titleId}" value="${escapeXml(titleHtml)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;align=center;verticalAlign=middle;" vertex="1" parent="1">
      <mxGeometry x="60" y="20" width="2460" height="55" as="geometry" />
    </mxCell>
  `);

  // Column Headers (5 functional domains)
  const columns = [
    { x: 60, width: 340, title: 'COLUMN 1: AUTHENTICATION &amp; REGISTRATION WHITELIST' },
    { x: 540, width: 340, title: 'COLUMN 2: GRADUATE PERSONA &amp; SECURITY TOKENS' },
    { x: 1040, width: 340, title: 'COLUMN 3: CAREER DOSSIER &amp; PORTFOLIO (WEAK DEPENDENTS)' },
    { x: 1600, width: 340, title: 'COLUMN 4: INSTITUTIONAL SURVEYS &amp; JOB VACANCIES' },
    { x: 2180, width: 340, title: 'COLUMN 5: INDUSTRY PARTNERS, CHAPTERS &amp; NETWORKING' }
  ];

  for (const col of columns) {
    const colId = nextId();
    cells.push(`
      <mxCell id="${colId}" value="&lt;b style=&quot;font-size:11px;letter-spacing:0.5px;&quot;&gt;${col.title}&lt;/b&gt;" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#000000;strokeWidth=1;fontColor=#000000;align=center;verticalAlign=middle;" vertex="1" parent="1">
        <mxGeometry x="${col.x}" y="85" width="${col.width}" height="32" as="geometry" />
      </mxCell>
    `);
  }

  // Entities
  const CARD_WIDTH = 340;

  for (const ent of entities) {
    const pos = layout[ent.id] || { x: 100, y: 100 };
    const entCellId = `ent_${ent.id}`;
    entityCellIdMap[ent.id] = entCellId;

    const isWeak = ent.type === 'weak';
    const attrCount = ent.attributes.length;
    // Calculate exact height: header ~48px, each attribute ~22px, padding ~8px
    const cardHeight = 48 + (attrCount * 22) + 8;

    // Build monochrome HTML table for entity
    let tableRows = '';
    for (const attr of ent.attributes) {
      let keyBadge = '';
      if (attr.key === 'PK') {
        keyBadge = '<span style="font-weight:bold;font-size:9px;border:1px solid #000000;padding:1px 3px;margin-right:4px;">PK</span>';
      } else if (attr.key === 'FK') {
        keyBadge = '<span style="font-weight:bold;font-size:9px;border:1px solid #555555;padding:1px 3px;margin-right:4px;">FK</span>';
      } else if (attr.key === 'UK') {
        keyBadge = '<span style="font-weight:bold;font-size:9px;border:1px solid #000000;padding:1px 3px;margin-right:4px;">UK</span>';
      } else {
        keyBadge = '<span style="display:inline-block;width:18px;"></span>';
      }

      tableRows += `
        <tr style="border-bottom:1px solid #e0e0e0;line-height:20px;">
          <td style="padding:2px 4px;width:34px;text-align:center;vertical-align:middle;">${keyBadge}</td>
          <td style="padding:2px 6px;text-align:left;vertical-align:middle;font-family:Consolas,monospace;font-size:11px;">
            <b>${escapeXml(attr.name)}</b>
          </td>
          <td style="padding:2px 6px;text-align:right;vertical-align:middle;font-family:Consolas,monospace;font-size:10px;color:#444444;">
            ${escapeXml(attr.type)}
          </td>
        </tr>
      `;
    }

    const badgeText = isWeak ? '[WEAK ENTITY]' : '[STRONG ENTITY]';
    const headerHtml = `
      <table style="width:100%;border-collapse:collapse;color:#000000;font-family:Arial,sans-serif;">
        <thead>
          <tr style="background:#f0f0f0;border-bottom:2px solid #000000;">
            <th colspan="3" style="padding:6px;text-align:center;">
              <div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">${escapeXml(ent.name)}</div>
              <div style="font-size:9px;font-weight:bold;color:#333333;margin-top:2px;letter-spacing:1px;">${badgeText}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `.trim().replace(/\s+/g, ' ');

    // Weak entities get double=1 (Chen & Crow's foot standard double border)
    // Strong entities get double=0
    const cellStyle = isWeak
      ? 'rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;double=1;align=left;verticalAlign=top;overflow=hidden;'
      : 'rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;double=0;align=left;verticalAlign=top;overflow=hidden;';

    cells.push(`
      <mxCell id="${entCellId}" value="${escapeXml(headerHtml)}" style="${cellStyle}" vertex="1" parent="1">
        <mxGeometry x="${pos.x}" y="${pos.y}" width="${CARD_WIDTH}" height="${cardHeight}" as="geometry" />
      </mxCell>
    `);
  }

  // Port coordinate helper
  const getPortCoords = (port) => {
    switch (port) {
      case 'top': return { x: 0.5, y: 0 };
      case 'bottom': return { x: 0.5, y: 1 };
      case 'left': return { x: 0, y: 0.5 };
      case 'right': return { x: 1, y: 0.5 };
      default: return { x: 0.5, y: 0.5 };
    }
  };

  // Relationships
  for (const rel of relationships) {
    const fromId = entityCellIdMap[rel.from];
    const toId = entityCellIdMap[rel.to];
    if (!fromId || !toId) {
      console.warn(`Skipping relation ${rel.id}: missing entity (${rel.from} -> ${rel.to})`);
      continue;
    }

    const relCellId = `edge_${rel.id}`;
    const isStrong = rel.type === 'strong';

    // Port anchors
    const pFrom = getPortCoords(rel.portFrom);
    const pTo = getPortCoords(rel.portTo);

    // Cardinality arrowheads
    // 1 : 1 -> ERone to ERone
    // 1 : N -> ERone to ERmany
    // 0..1 : N -> ERzeroToOne to ERmany
    let startArrow = 'ERone';
    let endArrow = 'ERmany';
    if (rel.card === '1 : 1') {
      startArrow = 'ERone';
      endArrow = 'ERone';
    } else if (rel.card.startsWith('0..1')) {
      startArrow = 'ERzeroToOne';
      endArrow = 'ERmany';
    }

    // Label
    const ruleShort = rel.rule.includes('CASCADE') ? 'CASCADE' : 'SET NULL';
    const edgeLabel = `${rel.label}<br/><span style="font-size:9px;font-weight:normal;">[${ruleShort}]</span>`;

    // Strong: Solid line (dashed=0, strokeWidth=2)
    // Weak: Broken / dashed line (dashed=1, dashPattern=8 4, strokeWidth=1.5)
    let edgeStyle = [
      'edgeStyle=orthogonalEdgeStyle',
      'rounded=1',
      'orthogonalLoop=1',
      'jettySize=auto',
      'html=1',
      `strokeColor=#000000`,
      isStrong ? 'strokeWidth=2' : 'strokeWidth=1.5',
      isStrong ? 'dashed=0' : 'dashed=1;dashPattern=8 4',
      `startArrow=${startArrow}`,
      'startFill=0',
      `endArrow=${endArrow}`,
      'endFill=0',
      `exitX=${pFrom.x}`,
      `exitY=${pFrom.y}`,
      `exitDx=0`,
      `exitDy=0`,
      `entryX=${pTo.x}`,
      `entryY=${pTo.y}`,
      `entryDx=0`,
      `entryDy=0`,
      'labelBackgroundColor=#ffffff',
      'labelBorderColor=#000000',
      'fontColor=#000000',
      'fontSize=10',
      'fontStyle=1'
    ].join(';') + ';';

    cells.push(`
      <mxCell id="${relCellId}" value="${escapeXml(edgeLabel)}" style="${edgeStyle}" edge="1" parent="1" source="${fromId}" target="${toId}">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
    `);
  }

  // Legend Box (Pure Monochrome)
  const legendId = nextId();
  const legendHtml = `
    <div style="font-family:Arial,sans-serif;color:#000000;padding:6px;">
      <div style="font-size:12px;font-weight:bold;text-align:center;border-bottom:1px solid #000000;padding-bottom:4px;margin-bottom:6px;">
        ERD FORMAL NOTATION LEGEND (MONOCHROME)
      </div>
      <table style="width:100%;font-size:10px;line-height:18px;border-collapse:collapse;">
        <tr>
          <td style="width:120px;font-weight:bold;">Single Border Rect:</td>
          <td><b>Strong Entity</b> (Independent existence, primary table)</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Double Border Rect:</td>
          <td><b>Weak Entity</b> (Dependent existence, requires parent foreign key)</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Solid Black Line:</td>
          <td><b>Strong Identifying Relationship</b> (ON DELETE CASCADE, parent existence required)</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Broken / Dashed Line:</td>
          <td><b>Weak Non-Identifying Relationship</b> (ON DELETE SET NULL, optional reference)</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Crow&#39;s Foot End:</td>
          <td><b>Many (N)</b> cardinality endpoint</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Crossbar End:</td>
          <td><b>Exactly One (1)</b> cardinality endpoint</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Ring + Crossbar:</td>
          <td><b>Zero or One (0..1)</b> optional cardinality endpoint</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Key Indicators:</td>
          <td><b>[PK]</b> Primary Key &bull; <b>[UK]</b> Unique Key &bull; <b>[FK]</b> Foreign Key</td>
        </tr>
      </table>
    </div>
  `.trim().replace(/\s+/g, ' ');

  cells.push(`
    <mxCell id="${legendId}" value="${escapeXml(legendHtml)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;align=left;verticalAlign=top;" vertex="1" parent="1">
      <mxGeometry x="60" y="1460" width="450" height="200" as="geometry" />
    </mxCell>
  `);

  // Build complete XML document
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Antigravity ERD Replicator" version="24.7.17">
  <diagram id="AlumniTrackerERD" name="AlumniTracker Complete ERD">
    <mxGraphModel dx="2800" dy="2200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2650" pageHeight="1900" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

  fs.writeFileSync(OUTPUT_ROOT, xml, 'utf8');
  console.log(`Saved Draw.io ERD to: ${OUTPUT_ROOT}`);

  fs.writeFileSync(OUTPUT_ARTIFACT, xml, 'utf8');
  console.log(`Saved Draw.io ERD to artifact: ${OUTPUT_ARTIFACT}`);
}

generateDrawio();
