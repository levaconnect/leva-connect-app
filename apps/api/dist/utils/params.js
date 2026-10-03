"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParams = getParams;
exports.getQuery = getQuery;
function getParams(request) {
    return request.params;
}
function getQuery(request) {
    return request.query;
}
