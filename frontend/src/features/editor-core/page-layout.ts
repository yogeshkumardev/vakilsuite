export interface PageLayoutSettings {
    pageSize: "A4" | "A3" | "Legal" | "Letter";
    orientation: "portrait" | "landscape";
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
}

export const DEFAULT_PAGE_LAYOUT: PageLayoutSettings = {
    pageSize: "A4",
    orientation: "portrait",
    marginTop: 25,
    marginRight: 25,
    marginBottom: 25,
    marginLeft: 25,
};
