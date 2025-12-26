const data = require("../storage/dataStore");

// Auth / users
module.exports = {
    // users
    listUsers: data.listUsers,
    createUser: data.createUser,
    findUserByEmail: data.findUserByEmail,
    findUserById: data.findUserById,
    updateUserRole: data.updateUserRole,
    updateUserProfile: data.updateUserProfile,

    // refresh tokens (tokenHash mode)
    addRefreshToken: (refreshToken, userId) => data.addRefreshToken(data.hashToken(refreshToken), userId),
    revokeRefreshToken: (refreshToken) => data.revokeRefreshToken(data.hashToken(refreshToken)),
    isRefreshTokenActive: (refreshToken, userId) => data.isRefreshTokenActive(data.hashToken(refreshToken), userId),

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

    // locations
    listCountries: data.listCountries,
    findCountryById: data.findCountryById,
    findCountryByName: data.findCountryByName,
    createCountry: data.createCountry,
    deleteCountry: data.deleteCountry,
    listCities: data.listCities,
    findCityById: data.findCityById,
    findCityByName: data.findCityByName,
    createCity: data.createCity,
    deleteCity: data.deleteCity,
};
