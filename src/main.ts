import './style.css'

import {LexicalSettings, ParserSettings, lex, parse} from "./Logic/parser";
import {evaluatePossibleWorld, getAllPossibleWorlds, getSteps} from "./Logic/ASTUtils.ts";

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

document.addEventListener("DOMContentLoaded", function () {
    let expression = "A(A+B)"
    let tokens = lex(expression, lexicalSettings)
    let ast = parse(tokens, parserSettings)

    // let possibleWorlds = getAllPossibleWorlds(ast)

    // for(let world of possibleWorlds) {
    //     console.log(world)
    //     console.log(evaluatePossibleWorld(ast, world))
    // }

    console.log(getSteps(ast))
})