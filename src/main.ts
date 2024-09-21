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

    let expression1 = localStorage.getItem("expression1") ?? ""
    let expression2 = localStorage.getItem("expression2") ?? ""

    $("#expr1").val(expression1)
    $("#expr2").val(expression2)

    updateTabs()

    $(".tab").click(function () {
        tabNumber = $(this).data("tab");
        $(".tab").removeClass("focussed-tab");
        $(`.tab[data-tab="${tabNumber}"]`).addClass("focussed-tab")
        updateTabs();
    })

    $("#expr1").change(function() {
        localStorage.setItem("expression1", $(this).val() as string)
        $(".table-area").empty()
    })

    $("#expr2").change(function() {
        localStorage.setItem("expression2", $(this).val() as string)
        $(".table-area").empty()
    })

    $("#generate").click(function() {
        // tabnumber===0 tells whether it is a single or comparison

        expression1 = localStorage.getItem("expression1") ?? ""
        expression2 = localStorage.getItem("expression2") ?? ""

        let ast1: AstNode = parse(lex(expression1, lexicalSettings), parserSettings)
        let ast2: AstNode = parse(lex(expression2, lexicalSettings), parserSettings)
        $(".table-area").empty();
        buildTable(".table-area", ast1, ast2, tabNumber === 1)
    })

    function updateTabs() {
        $(`.tabbable[data-tab=${tabNumber}]`).show();
        $(`.tabbable[data-tab!=${tabNumber}]`).hide();
    }

    /*
    // tabnumber===0 tells whether it is a single or comparison
        let ast1: AstNode = parse(lex(expression1, lexicalSettings), parserSettings)
        let ast2: AstNode = parse(lex(expression2, lexicalSettings), parserSettings)
        buildTable(".table-area", ast1, ast2, tabNumber === 1)
     */
})

// class ExpressionManager {
//     key: string
//
//     constructor(key: string) {
//         this.key = key
//     }
// }

function buildTable(mount: string,expression1: AstNode, expression2: AstNode, compare: boolean): JQuery<HTMLElement> {
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

    for (let step of [...expr1Steps, ...expr2Steps]) {
        let cell = $("<td></td>")
        cell.text(ASTToString(step, lexicalSettings, parserSettings))
        header.append(cell)
        if (step == expression1 || step == expression2) cell.addClass("final-step-header")
    }

    table.append(header)

    for (let world of worlds) {
        let row = $("<tr></tr>")

        let expr1TruthValue = evaluatePossibleWorld(expression1, world)
        let expr2TruthValue = evaluatePossibleWorld(expression2, world)

        if (compare && expr1TruthValue != expr2TruthValue) {
            row.addClass("mismatch-row")
        }

        for (let val of Object.values(world)) {
            row.append($("<td></td>").text(val ? "T" : "F"))
        }

        for (let step of [...expr1Steps, ...expr2Steps]) {
            let truthValue = evaluatePossibleWorld(step, world)
            row.append($("<td></td>").text(truthValue ? "T" : "F"))
        }

        table.append(row)
    }
}