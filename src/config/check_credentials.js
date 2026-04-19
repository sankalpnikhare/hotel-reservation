function check_credentials(name, email, password) {
    if (!name || !email || !password) {
        return false;
    }
    return true;
}

module.exports = check_credentials ; 