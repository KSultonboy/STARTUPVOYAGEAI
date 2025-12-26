function createError(status = 500, message = "Server error", code = "SERVER_ERROR", details) {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    if (details !== undefined) err.details = details;
    return err;
}

module.exports = { createError };
