export interface User {
    id: string;
    name: string;
    email: string;
    role: string | null;
    createAt: Date | null;
    updateAt: Date | null;
}
