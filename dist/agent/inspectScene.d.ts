export type SceneInspectionIssue = {
    level: 'error' | 'warning';
    type: string;
    message: string;
    componentId?: string;
    layerId?: string;
};
export type SceneInspectionReport = {
    valid: boolean;
    issues: SceneInspectionIssue[];
    summary: {
        duration: number;
        width: number;
        height: number;
        layers: number;
        components: number;
    };
};
export declare function inspectScene(input: unknown): SceneInspectionReport;
