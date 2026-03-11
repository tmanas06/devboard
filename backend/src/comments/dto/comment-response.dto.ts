export class CommentResponseDto {
    id: string;
    body: string;
    createdAt: Date;
    author: {
        id: string;
        name: string;
        email: string;
    };

    static from(comment: any): CommentResponseDto {
        return {
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            author: {
                id: comment.user.id,
                name: `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim() || comment.user.email,
                email: comment.user.email,
            },
        };
    }
}
