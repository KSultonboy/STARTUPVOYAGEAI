const data = require("../storage/dataStore");

// Auth / users
module.exports = {
    // users
    listUsers: data.listUsers,
    createUser: data.createUser,
    findUserByEmail: data.findUserByEmail,
    findUserById: data.findUserById,
    updateUserRole: data.updateUserRole,

    // refresh tokens
    addRefreshToken: data.addRefreshToken,
    revokeRefreshToken: data.revokeRefreshToken,
    isRefreshTokenActive: data.isRefreshTokenActive,

    // places
    listPlaces: data.listPlaces,
    findPlaceById: data.findPlaceById,
    findPlaceByKey: data.findPlaceByKey,
    createPlace: data.createPlace,
    updatePlace: data.updatePlace,
    deletePlace: data.deletePlace,
    deletePlaceByKey: data.deletePlaceByKey,

    // offers
    listOffers: data.listOffers,
    findOfferById: data.findOfferById,
    createOffer: data.createOffer,
    updateOffer: data.updateOffer,
    deleteOffer: data.deleteOffer,
};
