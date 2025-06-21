/**
 * Uploads a PDF file to your backend server which handles uploading to Google Drive,
 * and then grants access for the given email on the uploaded file.
 * @param {File} file - The PDF file object to upload
 * @param {string} name - The name of the user uploading the file
 * @param {string} email - The email of the user uploading the file (for granting access)
 * @param {string} desiredFileName - The desired file name to save as in Google Drive (e.g. order ID + ".pdf")
 * @returns {Promise<object>} - Resolves to an object containing fileId, fileName, webViewLink etc.
 */
export async function uploadPDFAndGetID(file, name, email, desiredFileName) {
  if (!file || !name || !email) {
    throw new Error("Name, email and file are required.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("email", email);

  if (desiredFileName) {
    formData.append("desiredFileName", desiredFileName);
  }

  try {
    // Upload the file
    const uploadResponse = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      let errorText = "Upload failed";
      try {
        const errorData = await uploadResponse.json();
        errorText = errorData.error || errorText;
      } catch {
        errorText = await uploadResponse.text();
      }
      throw new Error(errorText);
    }

    const data = await uploadResponse.json();

    const fileId = data.id || data.fileId || "";
    const fileName = data.name || data.fileName || "";
    const webViewLink = data.webViewLink || data.webViewLink || "";

    if (!fileId) {
      throw new Error("File ID missing after upload.");
    }

    // Grant access to the uploaded file for the given email
    const grantResponse = await fetch("http://localhost:5000/grant-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, email }),
    });

    if (!grantResponse.ok) {
      let errorText = "Grant access failed";
      try {
        const errorData = await grantResponse.json();
        errorText = errorData.error || errorText;
      } catch {
        errorText = await grantResponse.text();
      }
      throw new Error(errorText);
    }

    return {
      fileId,
      fileName,
      webViewLink,
    };
  } catch (err) {
    console.error("Error during uploadPDFAndGetID:", err);
    throw err;
  }
}
