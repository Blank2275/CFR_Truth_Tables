import './style.css'

import {AstNode, lex, LexicalSettings, parse, ParserSettings} from "./Logic/parser";
import $ from "jquery";
import {ASTToString, evaluatePossibleWorld, getAllPossibleWorlds, getAllVariables, getSteps} from "./Logic/ASTUtils.ts";

let lexicalSettings: LexicalSettings = {
    "And": "None",
    "Or": "+",
    "Not": "'",
    "Conditional": "->",
    "Biconditional": "<->"
}

let parserSettings: ParserSettings = {
    implicitAnd: true,
    prefixNot: false,
    explicitParentheses: false
}

$(function () {
    let tabNumber = 0;

    let expressionManager1 = new ExpressionManager("expression1")
    let expressionManager2 = new ExpressionManager("expression2")

    $("#expr1").val(expressionManager1.getCurrentExpression())
    $("#expr2").val(expressionManager2.getCurrentExpression())

    updateTabs()

    $(".tab").click(function () {
        tabNumber = $(this).data("tab");
        $(".tab").removeClass("focussed-tab");
        $(`.tab[data-tab="${tabNumber}"]`).addClass("focussed-tab")
        generate()
        updateTabs()
    })

    $("#expr1").change(function() {
        expressionManager1.setTemporaryExpression($(this).val() as string)
        $(".table-area").empty()
    })

    $("#expr1").on("keydown", function (e ) {
        if (e.key === "ArrowUp") {
            expressionManager1.previous()
            $("#expr1").val(expressionManager1.getCurrentExpression())
        } else if (e.key == "ArrowDown") {
            expressionManager1.next()
            $("#expr1").val(expressionManager1.getCurrentExpression())
        }
    })

    $("#expr2").on("keydown", function (e ) {
        if (e.key === "ArrowUp") {
            expressionManager2.previous()
            $("#expr2").val(expressionManager2.getCurrentExpression())
        } else if (e.key == "ArrowDown") {
            expressionManager2.next()
            $("#expr2").val(expressionManager2.getCurrentExpression())
        }
    })

    $("#expr2").change(function() {
        expressionManager2.setTemporaryExpression($(this).val() as string)
        $(".table-area").empty()
    })

    $("#generate").click(function() {
        generate()
    })

    function updateTabs() {
        $(`.tabbable[data-tab=${tabNumber}]`).show();
        $(`.tabbable[data-tab!=${tabNumber}]`).hide();
    }

    function generate() {
        // tabnumber===0 tells whether it is a single or comparison

        expressionManager1.addTemporaryExpression()
        expressionManager2.addTemporaryExpression()

        let ast1: AstNode = parse(lex(expressionManager1.getCurrentExpression(), lexicalSettings), parserSettings)
        let ast2: AstNode = parse(lex(expressionManager2.getCurrentExpression(), lexicalSettings), parserSettings)
        $(".table-area").empty();
        buildTable(".table-area", ast1, ast2, tabNumber === 1)
    }

    /*
    // tabnumber===0 tells whether it is a single or comparison
        let ast1: AstNode = parse(lex(expression1, lexicalSettings), parserSettings)
        let ast2: AstNode = parse(lex(expression2, lexicalSettings), parserSettings)
        buildTable(".table-area", ast1, ast2, tabNumber === 1)
     */
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
}

function buildTable(mount: string,expression1: AstNode, expression2: AstNode, compare: boolean){
    let table = $("<table></table>");
    table.addClass("table")
    $(mount).append(table)

    let vars = getAllVariables(expression1)

    if (compare) {
        let expr2Vars = getAllVariables(expression2)

        for (let variable of expr2Vars) {
            if (!vars.includes(variable)) vars.push(variable);
        }
    }

    const worlds = getAllPossibleWorlds(vars)
    const expr1Steps = getSteps(expression1)
    const expr2Steps = getSteps(expression2)

    let header = $("<tr></tr>");
    for (let val of Object.keys(worlds[0])) {
        header.append($("<th></th>").text(val))
    }

    let steps = expr1Steps
    if (compare) steps = [...steps, ...expr2Steps]
    for (let step of steps) {
        let cell = $("<td></td>")
        cell.text(ASTToString(step, lexicalSettings, parserSettings))
        header.append(cell)
        if (step == expression1 || step == expression2) cell.addClass("final-step-header")
    }

    table.append(header)

    for (let world of worlds) {
        let row = $("<tr></tr>")

        if (compare) {
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
        if (compare) steps = [...steps, ...expr2Steps]
        for (let step of steps) {
            let truthValue = evaluatePossibleWorld(step, world)
            row.append($("<td></td>").text(truthValue ? "T" : "F"))
        }

        table.append(row)
    }
}