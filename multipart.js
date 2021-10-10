const MULTIPART_ENTRY_FILENAME = /filename="(.+?)"/i;
const MULTIPART_ENTRY_NAME = /name="(.+?)"/i;
const MULTIPART_CONTENT_TYPE = /Content-Type:\s(.+)/i;
const MULTIPART_CONTENT_DISPOSITION = /Content-Disposition:\s(.+?);/i;
const MULTIPART_CONTENT_PREFIX = "\r\n\r\n";

const getBoundary = (e) => {
    const key = Object.keys(e.headers).find(k => k.toLowerCase() === "content-type");
    return e.headers[key] != null ? e.headers[key].split("=")[1] : null;
};

const getContent = (part, asText) => {
    const content = part.slice(part.search(MULTIPART_CONTENT_PREFIX) + MULTIPART_CONTENT_PREFIX.length, -4);
    return asText ? content : Buffer.from(content, 'binary');
};

const getFile = (part) => {
    return {
        name: part.match(MULTIPART_ENTRY_NAME)[1],
        fileName: part.match(MULTIPART_ENTRY_FILENAME)[1],
        contentType: part.match(MULTIPART_CONTENT_TYPE)[1],
        content: getContent(part, false)
    };
};

const parseBody = (body, boundary) => {
    const result = {
        files: {}
    };
    if (!boundary) {
        return result;
    }
    body.split(boundary)
        .filter(part => MULTIPART_CONTENT_DISPOSITION.test(part))
        .forEach(part => {
            if (MULTIPART_ENTRY_FILENAME.test(part)) {
                const file = getFile(part);
                if (result.files[file.name]) {
                    if (!Array.isArray(result.files[file.name])) {
                        result.files[file.name] = [result.files[file.name]];
                    }
                    result.files[file.name].push(file);
                } else {
                    result.files[file.name] = file;
                }
            } else if (MULTIPART_ENTRY_NAME.test(part)) {
                const fieldName = part.match(MULTIPART_ENTRY_NAME)[1];
                const fieldValue = getContent(part, true);
                result[fieldName] = fieldValue;
            }
        });
    return result;
};

exports.parse = async (e) => {
    const boundary = getBoundary(e);
    const body = e.isBase64Encoded ? Buffer.from(e.body, 'base64').toString('binary') : e.body;
    return parseBody(body, boundary);
};