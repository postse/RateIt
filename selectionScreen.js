$(document).ready(async function () {
    let listName = decodeURI(window.location.hash.substring(1));
    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000/public"
    });

    async function getList() {
        return await publicRoot.get("/listsToSort")
    }

    let lists = await getList();
    let list = lists.data.result.find(function (list) {
        return list.name === listName;
    });

    $("#criteriaText").html(list.name + ": " + list.criteria);

    $("#saveImage").on("click", function () {
        domtoimage.toBlob(document.getElementById('resultsTable'))
            .then(function (blob) {
                window.saveAs(blob,  'My ' + list.name + ' Rankings.png');
            });
    });

    let array = list.items.map(function (item) { return item; });

    let sortedList = await startMergeSort(randomizeList(array), array.length);
    sortedList = sortedList.reverse();

    displayRankingModal(list, sortedList);
});

async function startMergeSort(items, n) {
    let width, i;

    for (width = 1; width < n; width = width * 2) {
        for (i = 0; i < n; i = i + 2 * width) {
            await new Promise(async (resolve) => {

                await mergeSort(items, i, Math.min(i + width, n), Math.min(i + 2 * width, n));

                async function mergeSort(items, left, right, end) {
                    let n = left, m = right, currentSort = [], j;

                    for (j = left; j < end; j++) {

                        if (n < right && (m >= end || await wasRightClicked())) {
                            currentSort.push(items[n]);
                            n++;
                        }
                        else {
                            currentSort.push(items[m]);
                            m++;
                        }

                        async function wasRightClicked() {
                            let promiseName = await new Promise((resolve) => {

                                isRightGreater(items[n], items[m]);

                                function isRightGreater(leftItem, rightItem) {

                                    if (n === m) {
                                        resolve(true);
                                    }

                                    if (leftItem === undefined || rightItem === undefined) {
                                        resolve(false);
                                    }

                                    $("#leftSideText").html(leftItem.name);
                                    $("#leftSideImage").attr('src', leftItem.img);
                                    $("#rightSideText").html(rightItem.name);
                                    $("#rightSideImage").attr('src', rightItem.img)

                                    $(document).on('keyup', function (e) {
                                        if (e.which === 37) { // left
                                            $("#leftSideChoice").toggleClass("isClicked");
                                            $("#rightSideChoice").toggleClass("isNotClicked");
                                            setTimeout(function () {
                                                $("#leftSideChoice").toggleClass("isClicked");
                                                $("#rightSideChoice").toggleClass("isNotClicked");
                                                resolve(false);
                                            }, 300);
                                            $("#rightSideChoice").off();
                                            $("#leftSideChoice").off();
                                            $(document).off("keyup");
                                        } else if (e.which === 39) { // right
                                            $("#leftSideChoice").toggleClass("isNotClicked");
                                            $("#rightSideChoice").toggleClass("isClicked");
                                            setTimeout(function () {
                                                $("#leftSideChoice").toggleClass("isNotClicked");
                                                $("#rightSideChoice").toggleClass("isClicked");
                                                resolve(true);
                                            }, 300);
                                            $("#rightSideChoice").off();
                                            $("#leftSideChoice").off();
                                            $(document).off("keyup");
                                        }

                                        e.preventDefault();
                                    });

                                    $("#leftSideChoice").on("click", function (e) {
                                        $("#leftSideChoice").toggleClass("isClicked");
                                        $("#rightSideChoice").toggleClass("isNotClicked");
                                        setTimeout(function () {
                                            $("#leftSideChoice").toggleClass("isClicked");
                                            $("#rightSideChoice").toggleClass("isNotClicked");
                                            resolve(false);
                                        }, 300);
                                        $("#rightSideChoice").off();
                                        $("#leftSideChoice").off();
                                        $(document).off("keyup");
                                    });

                                    $("#rightSideChoice").on("click", function (e) {
                                        $("#leftSideChoice").toggleClass("isNotClicked");
                                        $("#rightSideChoice").toggleClass("isClicked");
                                        setTimeout(function () {
                                            $("#leftSideChoice").toggleClass("isNotClicked");
                                            $("#rightSideChoice").toggleClass("isClicked");
                                            resolve(true);
                                        }, 300);
                                        $("#rightSideChoice").off();
                                        $("#leftSideChoice").off();
                                        $(document).off("keyup");
                                    });

                                }
                            });
                            return promiseName;
                        }


                    }

                    currentSort.map(function (item, i) {
                        items[left + i] = item;
                    });

                }

                resolve();

            });

        }
    }
    return items;
}

function displayRankingModal(list, sortedList) {
    $("#rankingHeader").append(
        '<tr>' +
        '<th scope="col">#</th>' +
        '<th scope="col">' + list.name + ' - Rankings</th>' +
        '</tr>'
    )

    for (let i = 0; i < sortedList.length; i++) {
        $("#rankingRows").append(
            '<tr>' +
            '<th scope="row">' + (i + 1) + '</th>' +
            '<td>' + sortedList[i].name + '</td>' +
            '</tr>'
        )
    }
    $("#resultsModal").modal();
}

// Uses Fisher-Yates shuffle
function randomizeList(list) {
    let currentInd = list.length;
    let tempVal;
    let randomInd;

    while (0 !== currentInd) {
        randomInd = Math.floor(Math.random() * currentInd);
        currentInd--;

        tempVal = list[currentInd];
        list[currentInd] = list[randomInd];
        list[randomInd] = tempVal;
    }

    return list;
}