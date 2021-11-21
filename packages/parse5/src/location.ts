export interface EndLocation {
    endCol: number;
    endOffset: number;
    endLine: number;
}

export interface StartLocation {
    startCol: number;
    startOffset: number;
    startLine: number;
}

export type Location = EndLocation & StartLocation;

export interface StartTagLocation extends Location {
    attrs: Record<string, Location>;
}

export interface ElementLocation extends Location {
    attrs: Record<string, Location>;
    startTag: StartTagLocation;
    endTag: Location;
}
