
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove the header from the base64 string
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};
