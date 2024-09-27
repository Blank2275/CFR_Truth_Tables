import './style.css'

import {AstNode, lex, LexicalSettings, parse, ParserSettings} from "./Logic/parser";
import $ from "jquery";
import {
    ASTToString,
    evaluatePossibleWorld,
    getAllPossibleWorlds,
    getAllVariables,
    getSteps,
    validateExpr
} from "./Logic/ASTUtils.ts";

let lexicalSettings: LexicalSettings = {
    "And": "None",
    "Or": "+",
    "Not": "'",
    "Conditional": "->",
    "Biconditional": "<->"
}

let parserSettings: ParserSettings = {
    implicitAnd: true,
    prefixNot: true,
    explicitParentheses: false
}

$(function () {
    let tabNumber = 0;

    let expressionManager1 = new ExpressionManager("expression1")
    let expressionManager2 = new ExpressionManager("expression2")

    loadSettings()

    updateExpression1()
    updateExpression2()
    $("#expr1").val(expressionManager1.getCurrentExpression())
    $("#expr2").val(expressionManager2.getCurrentExpression())

    bindStringSettings("and-input", "And", lexicalSettings as any as {[key: string]: string})
    bindStringSettings("or-input", "Or", lexicalSettings as any as {[key: string]: string})
    bindStringSettings("not-input", "Not", lexicalSettings as any as {[key: string]: string})
    bindStringSettings("conditional-input", "Conditional", lexicalSettings as any as {[key: string]: string})
    bindStringSettings("biconditional-input", "Biconditional", lexicalSettings as any as {[key: string]: string})
    bindBoolSettings("implicit-and-input", "implicitAnd", parserSettings as any as {[key: string]: boolean})
    bindBoolSettings("prefix-not-input", "prefixNot", parserSettings as any as {[key: string]: boolean})
    bindBoolSettings("explicit-parentheses-input", "explicitParentheses", parserSettings as any as {[key: string]: boolean})

    updateTabs()

    $(".settings-toggle-image").click(function () {
        $(".settings-pane").animate({width: "toggle"}, 350)
    })

    $(".tab").click(function () {
        tabNumber = $(this).data("tab");
        $(".tab").removeClass("focussed-tab");
        $(`.tab[data-tab="${tabNumber}"]`).addClass("focussed-tab")
        generate()
        updateTabs()
    })

    $("#expr1").keyup(function() {
        expressionManager1.setTemporaryExpression($(this).val() as string)
        updateExpression1()
    })

    $("#expr2").keyup(function() {
        expressionManager2.setTemporaryExpression($(this).val() as string)
        updateExpression2()
    })

    $("#expr1").on("keydown", function (e ) {
        if (e.key === "ArrowUp") {
            expressionManager1.previous()
            updateExpression1()
            $("#expr1").val(expressionManager1.getCurrentExpression())
        } else if (e.key == "ArrowDown") {
            expressionManager1.next()
            updateExpression1()
            $("#expr1").val(expressionManager1.getCurrentExpression())
        }
    })

    $("#expr2").on("keydown", function (e ) {
        if (e.key === "ArrowUp") {
            expressionManager2.previous()
            updateExpression2()
            $("#expr2").val(expressionManager2.getCurrentExpression())
        } else if (e.key == "ArrowDown") {
            expressionManager2.next()
            updateExpression2()
            $("#expr2").val(expressionManager2.getCurrentExpression())
        }
    })


    $("#generate").click(function() {
        generate()
    })

    function bindStringSettings(id: string, key: string, data: {[key: string]: string}) {
        $(`#${id}`).val(data[key]);
        $(`#${id}`).change(function () {
            data[key] = ($(this).val() ?? "") as string

            updateExpression1() // we have to re-verify inputs against new syntax
            updateExpression2()

            saveSettings();
        })
    }

    function bindBoolSettings(id: string, key: string, data: {[key: string]: boolean}) {
        $(`#${id}`).prop("checked", data[key]);
        $(`#${id}`).change(function () {
            data[key] = $(`#${id}`).prop("checked")
            console.log(data[key])

            updateExpression1() // we have to re-verify inputs against new syntax
            updateExpression2()

            saveSettings();
        })
    }

    function saveSettings() {
        let settings = {...lexicalSettings, ...parserSettings}
        localStorage.setItem("settings", JSON.stringify(settings))
    }

    function loadSettings() {
        let settingsString = localStorage.getItem("settings") ?? "{}";
        let settings = JSON.parse(settingsString) as {[key: string]: any}

        lexicalSettings["And"] = settings["And"] ?? "*"
        lexicalSettings["Or"] = settings["Or"] ?? "+"
        lexicalSettings["Not"] = settings["Not"] ?? "'"
        lexicalSettings["Conditional"] = settings["Conditional"] ?? "->"
        lexicalSettings["Biconditional"] = settings["Biconditional"] ?? "<->"

        parserSettings["implicitAnd"] = settings["implicitAnd"] ?? true
        parserSettings["prefixNot"] = settings["prefixNot"] ?? false
        parserSettings["explicitParentheses"] = settings["explicitParentheses"] ?? false


    }

    function updateTabs() {
        $(`.tabbable[data-tab=${tabNumber}]`).show();
        $(`.tabbable[data-tab!=${tabNumber}]`).hide();
    }

    function generate() {
        // tabnumber===0 tells whether it is a single or comparison

        expressionManager1.addTemporaryExpression()
        expressionManager2.addTemporaryExpression()

        let expression1 = expressionManager1.getCurrentExpression()
        let expression2 = expressionManager2.getCurrentExpression()

        if (validateExpr(expression1, lexicalSettings, parserSettings) != "") return
        if (tabNumber == 1 && validateExpr(expression2, lexicalSettings, parserSettings) != "") return


        let ast1: AstNode = parse(lex(expression1, lexicalSettings), parserSettings)
        $(".table-area").empty();

        if (tabNumber == 1) {
        let ast2: AstNode = parse(lex(expression2, lexicalSettings), parserSettings)
        buildTable(".table-area", ast1, ast2)
        } else {
            buildTable(".table-area", ast1, null)
        }
    }

    function updateExpression1() {
        let status = validateExpr(expressionManager1.getTemporaryExpression(), lexicalSettings, parserSettings)
        let target = tabNumber == 0 ? $("#label-expression-0") : $("#label-expression-1");
        if (status == "") { // good
            target.text("Logical Expression 1")
        } else { // status = error message
            target.text(`Error: ${status}`)
        }
    }

    function updateExpression2() {
        if (tabNumber != 1) return
        let status = validateExpr(expressionManager2.getTemporaryExpression(), lexicalSettings, parserSettings)
        if (status == "") { // good
            $("#label-expression-2").text("Logical Expression 2")
        } else { // status = error message
            $("#label-expression-2").text(`Error: ${status}`)
        }
    }
})

class ExpressionManager {
    key: string
    history: string[]
    temporaryExpression: string = ""
    current = 0
    maxExpressions: number = 20

    constructor(key: string) {
        this.key = key

        try {
            this.history = JSON.parse(localStorage.getItem(this.key) ?? `[""]`) as string[]
            this.temporaryExpression = this.history[this.history.length - 1]
        } catch {
            this.history = [`""`]
            localStorage.setItem(this.key, `[""]`)
        }
        this.current = this.history.length - 1
    }

    addExpression(expression: string) {
        if (expression == this.history[this.history.length - 1]) return
        this.history.push(expression)

        if (this.history.length > this.maxExpressions) {
            this.history.shift()
        }

        localStorage.setItem(this.key, JSON.stringify(this.history))

        this.current = this.history.length - 1
    }

    previous() {
        this.current -= 1
        this.current = Math.max(this.current, 0)
    }

    next() {
        this.current += 1
        this.current = Math.min(this.current, this.history.length - 1)
    }

    setTemporaryExpression(temp: string) {
        this.temporaryExpression = temp
    }

    addTemporaryExpression() {
        this.addExpression(this.temporaryExpression)
    }

    getCurrentExpression(): string {
        if (this.history.length == 0) return ""

        return this.history[this.current]
    }

    getTemporaryExpression(): string {
        return this.temporaryExpression;
    }
}

function buildTable(mount: string,expression1: AstNode, expression2: AstNode | null){
    let table = $("<table></table>");
    table.addClass("table")
    $(mount).append(table)

    let vars = getAllVariables(expression1)

    if (expression2 != null) {
        let expr2Vars = getAllVariables(expression2)

        for (let variable of expr2Vars) {
            if (!vars.includes(variable)) vars.push(variable);
        }
    }

    const worlds = getAllPossibleWorlds(vars)
    const expr1Steps = getSteps(expression1)
    const expr2Steps = expression2 ? getSteps(expression2) : []

    let header = $("<tr></tr>");
    for (let val of Object.keys(worlds[0])) {
        let cell = $("<th></th>").text(val)
        header.append(cell)

        let expression1String = ASTToString(expression1, lexicalSettings, parserSettings);
        let expression2String = expression2 ? ASTToString(expression2, lexicalSettings, parserSettings) : "";

        if (val == expression1String || val == expression2String) cell.addClass("final-step-header")
    }

    let steps = expr1Steps
    if (expression2 != null) steps = [...steps, ...expr2Steps]
    for (let step of steps) {
        let cell = $("<td></td>")
        cell.text(ASTToString(step, lexicalSettings, parserSettings))
        header.append(cell)
        if (step == expression1 || step == expression2) cell.addClass("final-step-header")
    }

    table.append(header)

    for (let world of worlds) {
        let row = $("<tr></tr>")

        if (expression2 != null) {
            let expr1TruthValue = evaluatePossibleWorld(expression1, world)
            let expr2TruthValue = evaluatePossibleWorld(expression2, world)

            if (expr1TruthValue != expr2TruthValue) {
                row.addClass("mismatch-row")
            }
        }

        for (let val of Object.values(world)) {
            row.append($("<td></td>").text(val ? "T" : "F"))
        }

        let steps = expr1Steps
        if (expression2 != null) steps = [...steps, ...expr2Steps]
        for (let step of steps) {
            let truthValue = evaluatePossibleWorld(step, world)
            row.append($("<td></td>").text(truthValue ? "T" : "F"))
        }

        table.append(row)
    }
}