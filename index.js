const express = require("express");
const app = express();
const handlebars = require("express-handlebars");
const pg = require("./pg");
const bc = require("./bc");
var cookieSession = require("cookie-session");
const csurf = require("csurf");
const URL = require("url").URL;

app.engine("handlebars", handlebars());
app.set("view engine", "handlebars");

app.use(express.static("./public"));
app.use(express.static("./images"));
app.use(express.static("./script.js"));
app.use(
    cookieSession({
        secret: `I spilled the tea.`,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);
app.use(express.urlencoded({ extended: false }));
app.use(csurf());
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/petition", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
        return;
    }

    let sig;

    try {
        sig = await pg.getSignature(id);
    } catch (err) {
        res.render("petition", { layout: "main", error: err });
        return;
    }

    if (sig) {
        res.redirect("/thanks");
        return;
    }

    res.render("petition", { layout: "main" });
});

app.post("/petition", async (req, res) => {
    const id = req.session.id;

    if (!Object.values(req.body).every((v) => v != "")) {
        res.render("petition", {
            error: "Please sign the petition before submitting",
        });
        return;
    }

    try {
        await pg.createSignature(req.body.signature, id);
    } catch (err) {
        res.render("petition", { layout: "main", error: err });
        return;
    }

    res.redirect("/thanks");
});

app.get("/thanks", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
        return;
    }

    let sig;

    try {
        sig = await pg.getSignature(id);
    } catch (err) {
        res.render("thanks", { layout: "main", error: err });
        return;
    }

    if (!sig) {
        res.redirect("/petition");
        return;
    }

    res.render("thanks", { layout: "main", signature: sig.signature });
});

const signersHandler = async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
        return;
    }

    let sig;

    try {
        sig = await pg.getSignature(id);
    } catch (err) {
        res.render("signers", { layout: "main", error: err });
        return;
    }

    if (!sig) {
        res.redirect("/petition");
        return;
    }

    let signatures;
    try {
        signatures = await pg.getSignatures(req.params.city);
    } catch (err) {
        res.render("signers", { layout: "main", error: err });
        return;
    }

    res.render("signers", {
        layout: "main",
        signers: signatures,
        city: req.params.city,
        citiesClass: req.params.city ? "hide-cities" : "",
    });
};

app.get("/signers", signersHandler);
app.get("/signers/:city", signersHandler);

app.get("/register", (req, res) => {
    if (req.session.id) {
        res.redirect("/thanks");
        return;
    }
    res.render("register", { layout: "main" });
});

app.post("/register", async (req, res) => {
    if (!Object.values(req.body).every((v) => v != "")) {
        res.render("register", {
            error: "Please fill out the form before submitting",
        });
        return;
    }
    const hashedPassword = await bc.hash(req.body.password);

    let id;

    try {
        id = await pg.createUser(
            req.body.firstName,
            req.body.lastName,
            req.body.email,
            hashedPassword
        );
    } catch (err) {
        res.render("register", { layout: "main", error: err });
        return;
    }

    req.session.id = id;

    res.redirect("/profile");
});

app.get("/login", (req, res) => {
    if (req.session.id) {
        res.redirect("/thanks");
        return;
    }
    res.render("login", { layout: "main" });
});

app.post("/login", async (req, res) => {
    if (!Object.values(req.body).every((v) => v != "")) {
        res.render("login", {
            error: "Please fill out the form before submitting",
        });
        return;
    }

    let user;

    try {
        user = await pg.getUserInfo(req.body.email);
    } catch (err) {
        res.render("login", { layout: "main", error: err });
        return;
    }

    if (!user) {
        res.render("login", {
            layout: "main",
            error: "Please enter a valid password and email address",
        });
        return;
    }

    let match;
    try {
        match = await bc.compare(req.body.password, user.password);
    } catch (err) {
        res.render("login", { layout: "main", error: err });
        return;
    }

    if (!match) {
        res.render("login", {
            error: "Please enter a valid password and email address",
        });
        return;
    }

    req.session.id = user.id;

    let sig;

    try {
        sig = await pg.getSignature(user.id);
    } catch (err) {
        res.render("login", { error: err });
        return;
    }

    if (sig != undefined) {
        res.redirect("/thanks");
    } else {
        res.redirect("/petition");
    }
});

app.get("/logout", (req, res) => {
    delete req.session.id;
    res.redirect("/login");
});

app.get("/profile", async (req, res) => {
    const id = req.session.id;
    const userData = {
        url: req.body.url,
        city: req.body.city,
        age: req.body.age,
    };

    if (!id) {
        res.redirect("/login");
    }

    let sig;

    try {
        sig = await pg.getSignature(id);
    } catch (err) {
        res.render("profile", { error: err });
        return;
    }

    if (sig != undefined) {
        res.redirect("/thanks");
    } else {
        res.render("profile", { userData: userData, layout: "main" });
    }
});

app.post("/profile", async (req, res) => {
    const id = req.session.id;

    let url = req.body.url;

    const userData = {
        url: req.body.url,
        city: req.body.city,
        age: req.body.age,
    };

    if (url != "") {
        if (!stringIsAValidUrl(url)) {
            res.render("profile", {
                error:
                    "Please enter a valid url starting with http:// or https://",
                userData: userData,
            });
            return;
        }
    }

    try {
        await pg.createProfile(req.body.age, req.body.city, url, id);
    } catch (err) {
        res.render("profile", { userData: userData, error: err });
        return;
    }
    res.redirect("/petition");
});

app.get("/profile/edit", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
    }

    let userData;
    try {
        userData = await pg.getUserDataById(id);
    } catch (err) {
        res.render("profileedit", { error: err });
        return;
    }

    res.render("profileedit", {
        userData: userData,
    });
});

app.post("/profile/edit", async (req, res) => {
    const userData = {
        url: req.body.url,
        city: req.body.city,
        age: req.body.age,
        first: req.body.firstName,
        last: req.body.lastName,
        email: req.body.email,
    };

    if (req.body.url != "") {
        if (!stringIsAValidUrl(req.body.url)) {
            res.render("profileedit", {
                userData: userData,
                error:
                    "Please enter a valid url starting with http:// or https://",
            });
            return;
        }
    }

    let hashedPassword;
    if (req.body.password != "") {
        try {
            hashedPassword = await bc.hash(req.body.password);
        } catch (err) {
            res.render("profileedit", { userData: userData, error: err });
            return;
        }
    }

    try {
        await pg.updateUser(
            req.session.id,
            req.body.firstName,
            req.body.lastName,
            req.body.email,
            hashedPassword
        );
    } catch (err) {
        res.render("profileedit", { userData: userData, error: err });
        return;
    }

    try {
        await pg.updateProfile(
            req.session.id,
            req.body.age,
            req.body.city,
            req.body.url
        );
    } catch (err) {
        res.render("profileedit", { userData: userData, error: err });
        return;
    }

    res.redirect("/profile/thanks");
});

app.get("/profile/thanks", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
    }
    let userData;
    try {
        userData = await pg.getUserDataById(id);
    } catch (err) {
        res.render("thanksupdate", { error: err });
        return;
    }

    res.render("thanksupdate", {
        userData: userData,
    });
});

app.post("/signature/delete", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
    }

    try {
        pg.deleteSignature(id);
    } catch (err) {
        res.render("thanks", { error: err });
    }

    res.redirect("/petition");
});

app.post("/account/delete", async (req, res) => {
    const id = req.session.id;

    if (!id) {
        res.redirect("/login");
    }

    try {
        pg.deleteSignature(id);
    } catch (err) {
        res.render("profile/edit", { error: err });
    }

    try {
        pg.deleteProfile(id);
    } catch (err) {
        res.render("profile/edit", { error: err });
    }

    try {
        pg.deleteUser(id);
    } catch (err) {
        res.render("profile/edit", { error: err });
    }

    res.redirect("/logout");
});

const stringIsAValidUrl = (s) => {
    try {
        let url = new URL(s);
        return ["http:", "https:"].indexOf(url.protocol) != -1;
    } catch (err) {
        return false;
    }
};

app.listen(process.env.PORT || 8080, () => console.log("server listening!"));
