export interface UserAuth {
    name: string;
    email: string;
    password: string;
    role?: "user" | "admin";
}

export interface UserSignIn {
    email: string;
    password: string;
}

