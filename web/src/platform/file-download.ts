interface TriggerFileDownloadArgs {
  blob: Blob;
  fileName: string;
}

function triggerFileDownload({ blob, fileName }: TriggerFileDownloadArgs) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export {
  triggerFileDownload
};
