

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            try {
                const result = reader.result as string;
                // remove the header from the base64 string
                resolve(result.split(',')[1]);
            } catch (e) {
                reject(new Error(`Failed to process file ${file.name} to Base64: ${e instanceof Error ? e.message : String(e)}`));
            }
        };
        reader.onerror = error => reject(new Error(`File reading error for ${file.name}: ${error.target?.error?.message || String(error)}`));
    });
};

export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = (error) => reject(error);
    });
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};