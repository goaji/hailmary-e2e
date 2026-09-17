import { WIKI_PATH } from "../../pageObjects/WikiHubPage";
import type { DiagramKey } from "../../pageObjects/WikiPage";

// Where the MDX content places each diagram; wiki-content.spec.ts fails if one moves.
export const DIAGRAM_PAGES: Record<DiagramKey, string> = {
  fieldDiagram: `${WIKI_PATH}/the-game/terenul`,
  downSystemDiagram: `${WIKI_PATH}/the-game/sistemul-de-downuri`,
  offensivePositionsDiagram: `${WIKI_PATH}/chess-match/pozitii-ofensive`,
  defensivePositionsDiagram: `${WIKI_PATH}/chess-match/pozitii-defensive`,
  routeTreeDiagram: `${WIKI_PATH}/chess-match/arborele-de-rute`,
  situationalFootballDiagram: `${WIKI_PATH}/chess-match/fotbal-situational`,
  boxScoreDiagram: `${WIKI_PATH}/the-numbers/cum-citesti-un-box-score`,
  statLinesDiagram: `${WIKI_PATH}/the-numbers/index-statistici`,
};
