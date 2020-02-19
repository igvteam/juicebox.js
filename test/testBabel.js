/*
 * @author Jim Robinson Feb-2020
 */


foo();


async function foo() {
    const b = await bar();
    console.error(b);
}

async function bar() {

    return 5;
}